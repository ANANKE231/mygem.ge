package com.example.demo.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;

public final class FlittSignature {

	private FlittSignature() {
	}

	public static String sign(String secret, Map<String, ?> params) {
		TreeMap<String, String> sorted = new TreeMap<>();
		for (Map.Entry<String, ?> entry : params.entrySet()) {
			String key = entry.getKey();
			if (key == null || "signature".equals(key) || "response_signature_string".equals(key)) {
				continue;
			}
			Object value = entry.getValue();
			if (value == null) {
				continue;
			}
			String text = String.valueOf(value);
			if (text.isEmpty()) {
				continue;
			}
			sorted.put(key, text);
		}
		StringBuilder line = new StringBuilder(secret == null ? "" : secret);
		for (String value : sorted.values()) {
			line.append('|').append(value);
		}
		return sha1(line.toString());
	}

	public static boolean matches(String secret, Map<String, ?> params, String signature) {
		if (signature == null || signature.isBlank()) {
			return false;
		}
		return sign(secret, params).equalsIgnoreCase(signature.trim());
	}

	private static String sha1(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-1");
			byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		} catch (Exception ex) {
			throw new IllegalStateException("SHA-1 unavailable", ex);
		}
	}
}
