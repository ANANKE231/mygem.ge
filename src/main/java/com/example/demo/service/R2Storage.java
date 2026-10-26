package com.example.demo.service;

import com.example.demo.config.AppProperties;
import com.example.demo.web.ApiException;
import com.example.demo.web.MediaUrls;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

@Service
public class R2Storage {

	private static final Logger log = LoggerFactory.getLogger(R2Storage.class);
	private static final DateTimeFormatter AMZ_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
	private static final String EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

	private final AppProperties props;
	private final HttpClient http = HttpClient.newBuilder()
			.version(HttpClient.Version.HTTP_1_1)
			.connectTimeout(Duration.ofSeconds(10))
			.followRedirects(HttpClient.Redirect.NEVER)
			.build();

	private boolean ready;

	public R2Storage(AppProperties props) {
		this.props = props;
	}

	@PostConstruct
	void checkConfig() {
		int set = (blank(accessKey()) ? 0 : 1) + (blank(secret()) ? 0 : 1) + (blank(endpoint()) ? 0 : 1) + (blank(bucket()) ? 0 : 1) + (blank(publicBase()) ? 0 : 1);
		if (set == 0) {
			ready = false;
			log.info("photo storage is off");
			return;
		}
		if (set != 5) {
			throw new IllegalStateException("photo storage needs R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, and R2_PUBLIC_BASE");
		}
		ready = true;
		log.info("photo storage is on");
	}

	public boolean enabled() {
		return ready;
	}

	public String clientUrl(String stored) {
		if (stored == null || stored.isBlank()) {
			return "";
		}
		if (ready && MediaUrls.objectKey(stored)) {
			return publicBase() + "/" + stored;
		}
		return stored;
	}

	public String keyFrom(String value) {
		if (value == null) {
			return null;
		}
		String text = value.trim();
		if (MediaUrls.objectKey(text)) {
			return text;
		}
		String base = publicBase();
		if (base.isEmpty() || !text.startsWith(base + "/")) {
			return null;
		}
		String rest = text.substring(base.length() + 1);
		int cut = rest.indexOf('?');
		if (cut >= 0) {
			rest = rest.substring(0, cut);
		}
		cut = rest.indexOf('#');
		if (cut >= 0) {
			rest = rest.substring(0, cut);
		}
		return MediaUrls.objectKey(rest) ? rest : null;
	}

	public void put(String key, byte[] body, String contentType) {
		exchange("PUT", key, body, contentType);
	}

	public void delete(String key) {
		if (!MediaUrls.objectKey(key)) {
			return;
		}
		try {
			exchange("DELETE", key, new byte[0], null);
		} catch (ApiException ex) {
			log.warn("could not delete stored photo {}", key);
		}
	}

	private void exchange(String method, String key, byte[] body, String contentType) {
		if (!ready) {
			throw new ApiException(503, "storage_off", "ფოტოს ატვირთვა ამჟამად მიუწვდომელია");
		}
		if (!MediaUrls.objectKey(key)) {
			throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
		}
		String amzDate = AMZ_TIME.format(java.time.Instant.now());
		String payloadHash = body.length == 0 ? EMPTY_HASH : hex(sha256(body));
		String canonicalUri = awsPath("/" + bucket() + "/" + key);
		String host = host();
		TreeMap<String, String> headers = new TreeMap<>();
		headers.put("host", host);
		headers.put("x-amz-content-sha256", payloadHash);
		headers.put("x-amz-date", amzDate);
		if (contentType != null) {
			headers.put("content-type", contentType);
			headers.put("cache-control", "public, max-age=31536000, immutable");
		}
		String authorization = authorization(method, canonicalUri, headers, payloadHash, amzDate);
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(endpoint() + canonicalUri))
				.timeout(Duration.ofSeconds(30))
				.header("x-amz-date", amzDate)
				.header("x-amz-content-sha256", payloadHash)
				.header("Authorization", authorization);
		if (contentType != null) {
			request.header("Content-Type", contentType);
			request.header("Cache-Control", "public, max-age=31536000, immutable");
		}
		if ("DELETE".equals(method)) {
			request.method("DELETE", HttpRequest.BodyPublishers.ofByteArray(body));
		} else {
			request.PUT(HttpRequest.BodyPublishers.ofByteArray(body));
		}
		try {
			HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
			int status = response.statusCode();
			if (status >= 200 && status < 300) {
				return;
			}
			if ("DELETE".equals(method) && status == 404) {
				return;
			}
			String detail = response.body() == null ? "" : response.body();
			if (detail.length() > 300) {
				detail = detail.substring(0, 300);
			}
			log.warn("photo storage {} failed with status {}", method, status);
			log.warn("photo storage response {}", detail.replaceAll("[\\r\\n]+", " "));
			throw new ApiException(502, "storage_failed", "ფოტოს ატვირთვა ვერ მოხერხდა");
		} catch (ApiException ex) {
			throw ex;
		} catch (Exception ex) {
			if (ex instanceof InterruptedException) {
				Thread.currentThread().interrupt();
			}
			log.warn("photo storage request failed");
			throw new ApiException(502, "storage_failed", "ფოტოს ატვირთვა ვერ მოხერხდა");
		}
	}

	private String authorization(String method, String canonicalUri, Map<String, String> headers, String payloadHash, String amzDate) {
		StringBuilder canonicalHeaders = new StringBuilder();
		StringBuilder signedHeaders = new StringBuilder();
		for (Map.Entry<String, String> header : headers.entrySet()) {
			canonicalHeaders.append(header.getKey()).append(':').append(header.getValue().trim()).append('\n');
			if (!signedHeaders.isEmpty()) {
				signedHeaders.append(';');
			}
			signedHeaders.append(header.getKey());
		}
		String canonicalRequest = method + "\n" + canonicalUri + "\n\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + payloadHash;
		String dateStamp = amzDate.substring(0, 8);
		String scope = dateStamp + "/auto/s3/aws4_request";
		String stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + hex(sha256(canonicalRequest.getBytes(StandardCharsets.UTF_8)));
		String signature = hex(hmac(signingKey(dateStamp), stringToSign));
		return "AWS4-HMAC-SHA256 Credential=" + accessKey() + "/" + scope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
	}

	private byte[] signingKey(String dateStamp) {
		byte[] date = hmac(("AWS4" + secret()).getBytes(StandardCharsets.UTF_8), dateStamp);
		byte[] region = hmac(date, "auto");
		byte[] service = hmac(region, "s3");
		return hmac(service, "aws4_request");
	}

	private String host() {
		URI uri = URI.create(endpoint());
		return uri.getPort() < 0 ? uri.getHost() : uri.getHost() + ":" + uri.getPort();
	}

	private String accessKey() {
		return text(props.getR2AccessKeyId());
	}

	private String secret() {
		return text(props.getR2SecretAccessKey());
	}

	private String endpoint() {
		String value = text(props.getR2Endpoint());
		while (value.endsWith("/")) {
			value = value.substring(0, value.length() - 1);
		}
		return value;
	}

	private String bucket() {
		return text(props.getR2Bucket());
	}

	private String publicBase() {
		String value = text(props.getR2PublicBase());
		while (value.endsWith("/")) {
			value = value.substring(0, value.length() - 1);
		}
		return value;
	}

	private static boolean blank(String value) {
		return value == null || value.isBlank();
	}

	private static String text(String value) {
		return value == null ? "" : value.trim();
	}

	private static String awsPath(String absolute) {
		String[] parts = absolute.split("/", -1);
		StringBuilder out = new StringBuilder();
		for (int i = 0; i < parts.length; i++) {
			if (i > 0) {
				out.append('/');
			}
			out.append(URLEncoder.encode(parts[i], StandardCharsets.UTF_8).replace("+", "%20").replace("%7E", "~"));
		}
		return out.toString();
	}

	private static byte[] hmac(byte[] key, String data) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(key, "HmacSHA256"));
			return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
		} catch (Exception ex) {
			throw new IllegalStateException("could not sign storage request");
		}
	}

	private static byte[] sha256(byte[] data) {
		try {
			return MessageDigest.getInstance("SHA-256").digest(data);
		} catch (Exception ex) {
			throw new IllegalStateException("could not hash storage request");
		}
	}

	private static String hex(byte[] data) {
		return HexFormat.of().formatHex(data);
	}

	void enableForTest() {
		ready = !blank(accessKey()) && !blank(secret()) && !blank(endpoint()) && !blank(bucket()) && !blank(publicBase());
	}

}
