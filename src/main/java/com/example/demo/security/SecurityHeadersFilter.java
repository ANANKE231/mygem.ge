package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class SecurityHeadersFilter extends OncePerRequestFilter {

	static final String CSP = String.join("; ",
			"default-src 'self'",
			"script-src 'self' https://accounts.google.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"font-src 'self' https://fonts.gstatic.com data:",
			"img-src 'self' data: blob: https:",
			"connect-src 'self' https:",
			"frame-src https://accounts.google.com",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self' https://formsubmit.co");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("X-Frame-Options", "SAMEORIGIN");
		response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
		response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
		response.setHeader("Content-Security-Policy", CSP);
		if (request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"))) {
			response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
		}
		filterChain.doFilter(request, response);
	}

}
