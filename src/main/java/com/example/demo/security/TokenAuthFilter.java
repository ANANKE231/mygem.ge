package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class TokenAuthFilter extends OncePerRequestFilter {

	public static final String SITE_HEADER = "X-MyGem";

	private final SessionService sessions;

	public TokenAuthFilter(SessionService sessions) {
		this.sessions = sessions;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String header = request.getHeader("Authorization");
		String token = null;
		boolean fromCookie = false;
		if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			token = header.substring(7).trim();
		} else {
			token = SessionCookie.read(request);
			fromCookie = token != null;
		}
		if (fromCookie && changesState(request) && !"1".equals(request.getHeader(SITE_HEADER))) {
			response.setStatus(403);
			response.setContentType("application/json");
			response.setCharacterEncoding(StandardCharsets.UTF_8.name());
			response.getWriter().write("{\"ok\":false,\"error\":\"forbidden\",\"message\":\"მოთხოვნა უარყოფილია\"}");
			return;
		}
		if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
			String email = sessions.email(token);
			if (email != null) {
				UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
						email, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
				SecurityContextHolder.getContext().setAuthentication(auth);
			}
		}
		filterChain.doFilter(request, response);
	}

	private static boolean changesState(HttpServletRequest request) {
		String method = request.getMethod();
		return HttpMethod.POST.matches(method) || HttpMethod.PUT.matches(method)
				|| HttpMethod.DELETE.matches(method) || HttpMethod.PATCH.matches(method);
	}

}
