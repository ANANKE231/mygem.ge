package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class AuthRateLimitFilter extends OncePerRequestFilter {

	private static final int LIMIT = 30;
	private static final long WINDOW_MS = 60_000L;
	private static final Set<String> PATHS = Set.of(
			"/api/auth/login",
			"/api/auth/register",
			"/api/auth/forgot",
			"/api/auth/forgot-password",
			"/api/auth/google");

	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		if (!HttpMethod.POST.matches(request.getMethod()) || !PATHS.contains(request.getRequestURI())) {
			filterChain.doFilter(request, response);
			return;
		}
		long now = System.currentTimeMillis();
		boolean[] blocked = {false};
		windows.compute(clientKey(request), (key, window) -> {
			if (window == null || now - window.start > WINDOW_MS) {
				return new Window(now, 1);
			}
			if (window.count >= LIMIT) {
				blocked[0] = true;
				return window;
			}
			window.count++;
			return window;
		});
		if (blocked[0]) {
			response.setStatus(429);
			response.setContentType("application/json;charset=UTF-8");
			response.getWriter().write("{\"ok\":false,\"error\":\"rate_limited\",\"message\":\"ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.\"}");
			return;
		}
		filterChain.doFilter(request, response);
	}

	private static String clientKey(HttpServletRequest request) {
		String remote = request.getRemoteAddr() == null ? "" : request.getRemoteAddr();
		if (isLocal(remote)) {
			String forwarded = request.getHeader("X-Forwarded-For");
			if (forwarded != null && !forwarded.isBlank()) {
				String[] hops = forwarded.split(",");
				String last = hops[hops.length - 1].trim();
				if (!last.isBlank()) {
					return last;
				}
			}
		}
		return remote;
	}

	private static boolean isLocal(String remote) {
		return "127.0.0.1".equals(remote) || "::1".equals(remote) || remote.startsWith("10.")
				|| remote.startsWith("192.168.") || remote.startsWith("172.16.") || remote.startsWith("172.17.")
				|| remote.startsWith("172.18.") || remote.startsWith("172.19.") || remote.startsWith("172.2")
				|| remote.startsWith("172.30.") || remote.startsWith("172.31.");
	}

	private static final class Window {
		private final long start;
		private int count;

		private Window(long start, int count) {
			this.start = start;
			this.count = count;
		}
	}

}
