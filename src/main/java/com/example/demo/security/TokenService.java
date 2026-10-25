package com.example.demo.security;

import com.example.demo.config.AppProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Service
public class TokenService {

	private final AppProperties props;

	public TokenService(AppProperties props) {
		this.props = props;
	}

	public String issue(String sessionId, long expiresAtEpochSeconds) {
		String body = sessionId + "|" + expiresAtEpochSeconds;
		String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(body.getBytes(StandardCharsets.UTF_8));
		return payload + "." + sign(payload);
	}

	public String sessionId(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}
		int dot = token.indexOf('.');
		if (dot <= 0 || dot == token.length() - 1) {
			return null;
		}
		String payload = token.substring(0, dot);
		String mac = token.substring(dot + 1);
		if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), mac.getBytes(StandardCharsets.UTF_8))) {
			return null;
		}
		String body;
		try {
			body = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
		} catch (IllegalArgumentException ex) {
			return null;
		}
		int split = body.lastIndexOf('|');
		if (split <= 0) {
			return null;
		}
		try {
			long exp = Long.parseLong(body.substring(split + 1));
			if (exp < Instant.now().getEpochSecond()) {
				return null;
			}
		} catch (NumberFormatException ex) {
			return null;
		}
		return body.substring(0, split);
	}

	private String sign(String payload) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(props.getTokenSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
		} catch (Exception ex) {
			throw new IllegalStateException("Token signing failed", ex);
		}
	}

}
