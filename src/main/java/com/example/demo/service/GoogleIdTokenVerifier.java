package com.example.demo.service;

import com.example.demo.web.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class GoogleIdTokenVerifier {

	private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
	private static final String CERTS = "https://www.googleapis.com/oauth2/v3/certs";

	private final ObjectMapper json;
	private final HttpClient http;
	private volatile Map<String, PublicKey> keys = Map.of();
	private volatile long fetchedAt;

	public GoogleIdTokenVerifier(ObjectMapper json) {
		this.json = json;
		this.http = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(6))
				.followRedirects(HttpClient.Redirect.NEVER)
				.build();
	}

	public GoogleProfile verify(String credential, String clientId) {
		String[] parts = credential == null ? new String[0] : credential.split("\\.");
		if (parts.length != 3 || credential.length() > 4096) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		JsonNode header = decode(parts[0]);
		if (!"RS256".equals(header.path("alg").asText(""))) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		PublicKey key = key(header.path("kid").asText(""));
		if (key == null || !signatureValid(parts, key)) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		JsonNode claims = decode(parts[1]);
		String issuer = claims.path("iss").asText("");
		String audience = claims.path("aud").asText("");
		String subject = claims.path("sub").asText("").trim();
		String email = claims.path("email").asText("").trim().toLowerCase(Locale.ROOT);
		if (!ISSUERS.contains(issuer) || !audience.equals(clientId) || subject.isBlank() || email.isBlank()) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		if (!verified(claims.get("email_verified"))) {
			throw new ApiException(403, "email_not_verified", "თქვენი Google ელ-ფოსტა დადასტურებული არ არის");
		}
		long expires = claims.path("exp").asLong(0);
		if (expires <= 0 || expires * 1000L < System.currentTimeMillis() - 60_000) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		return new GoogleProfile(subject, email, clean(claims, "name", 80), clean(claims, "given_name", 60), clean(claims, "family_name", 60), picture(claims));
	}

	private PublicKey key(String kid) {
		if (kid.isBlank()) {
			return null;
		}
		PublicKey found = keys.get(kid);
		if (found != null) {
			return found;
		}
		synchronized (this) {
			found = keys.get(kid);
			if (found != null) {
				return found;
			}
			if (fetchedAt > 0 && System.currentTimeMillis() - fetchedAt < 60_000) {
				return null;
			}
			refresh();
			return keys.get(kid);
		}
	}

	private void refresh() {
		HttpRequest request = HttpRequest.newBuilder(URI.create(CERTS))
				.timeout(Duration.ofSeconds(8))
				.header("Accept", "application/json")
				.GET()
				.build();
		try {
			HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
			if (response.statusCode() != 200) {
				fetchedAt = System.currentTimeMillis();
				return;
			}
			JsonNode body = json.readTree(response.body());
			Map<String, PublicKey> next = new HashMap<>();
			for (JsonNode jwk : body.path("keys")) {
				if (!"RSA".equals(jwk.path("kty").asText("")) || jwk.path("kid").asText("").isBlank()) {
					continue;
				}
				byte[] modulus = b64(jwk.path("n").asText(""));
				byte[] exponent = b64(jwk.path("e").asText(""));
				if (modulus.length == 0 || exponent.length == 0) {
					continue;
				}
				PublicKey publicKey = KeyFactory.getInstance("RSA").generatePublic(
						new RSAPublicKeySpec(new BigInteger(1, modulus), new BigInteger(1, exponent)));
				next.put(jwk.path("kid").asText(""), publicKey);
			}
			if (!next.isEmpty()) {
				keys = Map.copyOf(next);
			}
			fetchedAt = System.currentTimeMillis();
		} catch (Exception ex) {
			fetchedAt = System.currentTimeMillis();
		}
	}

	private boolean signatureValid(String[] parts, PublicKey key) {
		try {
			Signature signature = Signature.getInstance("SHA256withRSA");
			signature.initVerify(key);
			signature.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
			return signature.verify(b64(parts[2]));
		} catch (Exception ex) {
			return false;
		}
	}

	private JsonNode decode(String part) {
		try {
			return json.readTree(new String(b64(part), StandardCharsets.UTF_8));
		} catch (Exception ex) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
	}

	private static byte[] b64(String value) {
		if (value == null || value.isBlank()) {
			return new byte[0];
		}
		int pad = (4 - value.length() % 4) % 4;
		try {
			return Base64.getUrlDecoder().decode(value + "=".repeat(pad));
		} catch (IllegalArgumentException ex) {
			return new byte[0];
		}
	}

	private static boolean verified(JsonNode value) {
		if (value == null || value.isNull()) {
			return false;
		}
		if (value.isBoolean()) {
			return value.asBoolean();
		}
		return "true".equalsIgnoreCase(value.asText(""));
	}

	private static String picture(JsonNode claims) {
		String picture = claims.path("picture").asText("");
		if (picture.matches("(?i)https://[a-z0-9.-]+\\.googleusercontent\\.com/.*") && picture.length() < 500) {
			return picture;
		}
		return "";
	}

	private static String clean(JsonNode claims, String field, int max) {
		String value = claims.path(field).asText("").replaceAll("[\\u0000-\\u001f<>]", "").trim();
		return value.length() <= max ? value : value.substring(0, max);
	}

	public record GoogleProfile(String sub, String email, String name, String given, String family, String picture) {
	}

}
