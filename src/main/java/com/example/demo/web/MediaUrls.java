package com.example.demo.web;

import java.util.regex.Pattern;

public final class MediaUrls {

	private static final Pattern OBJECT_KEY = Pattern.compile("^(?:avatars|listings)/[0-9]+/[0-9a-f]{32}\\.(?:jpg|png|webp)$");

	private MediaUrls() {
	}

	public static boolean objectKey(String value) {
		return value != null && OBJECT_KEY.matcher(value).matches();
	}

	public static boolean image(String value) {
		if (value == null || value.isBlank() || value.length() > 1_500_000) {
			return false;
		}
		if (objectKey(value)) {
			return true;
		}
		if (value.startsWith("/images/") && localPath(value)) {
			return true;
		}
		if (value.startsWith("data:image/jpeg;base64,") || value.startsWith("data:image/png;base64,") || value.startsWith("data:image/webp;base64,")) {
			return true;
		}
		return https(value);
	}

	public static boolean receipt(String value) {
		if (value != null && value.startsWith("data:application/pdf;base64,") && value.length() <= 1_500_000) {
			return true;
		}
		return image(value);
	}

	public static boolean avatar(String value) {
		return value != null && (image(value) || https(value));
	}

	private static boolean localPath(String value) {
		return value.length() < 200 && !value.contains("..") && !value.contains("\\") && !value.contains("//") && !value.contains(" ");
	}

	private static boolean https(String value) {
		return value.startsWith("https://") && value.length() < 500 && value.indexOf(' ') < 0 && value.indexOf('"') < 0 && value.indexOf('\'') < 0 && value.indexOf('<') < 0;
	}

}
