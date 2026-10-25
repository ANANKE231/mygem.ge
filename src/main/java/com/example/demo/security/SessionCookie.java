package com.example.demo.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

public final class SessionCookie {

	public static final String NAME = "mygem_session";

	private SessionCookie() {
	}

	public static void write(HttpServletRequest request, HttpServletResponse response, String token, int days) {
		ResponseCookie cookie = ResponseCookie.from(NAME, token)
				.httpOnly(true)
				.secure(secure(request))
				.sameSite("Lax")
				.path("/")
				.maxAge(Duration.ofDays(Math.max(days, 1)))
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public static void clear(HttpServletRequest request, HttpServletResponse response) {
		ResponseCookie cookie = ResponseCookie.from(NAME, "")
				.httpOnly(true)
				.secure(secure(request))
				.sameSite("Lax")
				.path("/")
				.maxAge(0)
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public static String read(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private static boolean secure(HttpServletRequest request) {
		return request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
	}

}
