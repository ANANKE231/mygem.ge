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

	public String issue(String email) {
		long exp = Instant.now().plusSeconds(props.getTokenDays() * 24L * 60L * 60L).getEpochSecond();
		String body = Base64.getUrlEncoder().withoutPadding()
				.encodeToString((email + "|" + exp).getBytes(StandardCharsets.UTF_8));
		return body + "." + sign(body);
	}

	public String parse(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}
		String[] parts = token.split("\\.");
		if (parts.length != 2) {
			return null;
		}
		byte[] expected = sign(parts[0]).getBytes(StandardCharsets.UTF_8);
		byte[] actual = parts[1].getBytes(StandardCharsets.UTF_8);
		if (!MessageDigest.isEqual(expected, actual)) {
			return null;
		}
		String payload;
		try {
			payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
		} catch (IllegalArgumentException ex) {
			return null;
		}
		int bar = payload.lastIndexOf('|');
		if (bar <= 0) {
			return null;
		}
		long exp;
		try {
			exp = Long.parseLong(payload.substring(bar + 1));
		} catch (NumberFormatException ex) {
			return null;
		}
		if (exp < Instant.now().getEpochSecond()) {
			return null;
		}
		return payload.substring(0, bar);
	}

	private String sign(String body) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(props.getTokenSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
		} catch (Exception ex) {
			throw new IllegalStateException("Could not sign token", ex);
		}
	}

}
