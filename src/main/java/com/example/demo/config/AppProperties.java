package com.example.demo.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.Locale;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

	private String tokenSecret;
	private int tokenDays = 14;
	private String adminEmails = "";

	@PostConstruct
	void check() {
		if (tokenSecret == null || tokenSecret.length() < 16) {
			throw new IllegalStateException("app.token-secret must be at least 16 characters");
		}
		if (adminEmails == null || adminEmails.isBlank()) {
			throw new IllegalStateException("app.admin-emails must be set");
		}
	}

	public boolean isAdmin(String email) {
		if (email == null || email.isBlank()) {
			return false;
		}
		String needle = email.trim().toLowerCase(Locale.ROOT);
		return Arrays.stream(adminEmails.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.map(s -> s.toLowerCase(Locale.ROOT))
				.anyMatch(needle::equals);
	}

	public String getTokenSecret() {
		return tokenSecret;
	}

	public void setTokenSecret(String tokenSecret) {
		this.tokenSecret = tokenSecret;
	}

	public int getTokenDays() {
		return tokenDays;
	}

	public void setTokenDays(int tokenDays) {
		this.tokenDays = tokenDays;
	}

	public String getAdminEmails() {
		return adminEmails;
	}

	public void setAdminEmails(String adminEmails) {
		this.adminEmails = adminEmails;
	}

}
