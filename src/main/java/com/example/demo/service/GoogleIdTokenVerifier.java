package com.example.demo.service;

import com.example.demo.web.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Component
public class GoogleIdTokenVerifier {

	private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

	private final ObjectMapper json;
	private final HttpClient http;

	public GoogleIdTokenVerifier(ObjectMapper json) {
		this.json = json;
		this.http = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(6))
				.followRedirects(HttpClient.Redirect.NEVER)
				.build();
	}

	public GoogleProfile verify(String credential, String clientId) {
		if (credential == null || credential.isBlank() || credential.length() > 4096 || credential.chars().filter(ch -> ch == '.').count() != 2) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + URLEncoder.encode(credential, StandardCharsets.UTF_8);
		HttpRequest request = HttpRequest.newBuilder(URI.create(url))
				.timeout(Duration.ofSeconds(8))
				.GET()
				.build();
		HttpResponse<String> response;
		try {
			response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
		} catch (Exception ex) {
			throw new ApiException(502, "network", "სერვერთან დაკავშირება ვერ მოხერხდა");
		}
		if (response.statusCode() != 200) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		JsonNode claims;
		try {
			claims = json.readTree(response.body());
		} catch (Exception ex) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
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
		if (expires > 0 && expires * 1000L < System.currentTimeMillis() - 60_000) {
			throw new ApiException(401, "bad_token", "Google-ით შესვლა ვერ მოხერხდა");
		}
		return new GoogleProfile(subject, email, clean(claims, "name", 80), clean(claims, "given_name", 60), clean(claims, "family_name", 60), picture(claims));
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
		if (picture.matches("(?i)https://[a-z0-9.-]+\\.googleusercontent\\.com/.*")) {
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
