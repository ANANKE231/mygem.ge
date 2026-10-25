package com.example.demo.web;

public final class MediaUrls {

	private MediaUrls() {
	}

	public static boolean image(String value) {
		if (value == null || value.isBlank() || value.length() > 1_500_000) {
			return false;
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
