package com.example.demo.web;

import com.example.demo.config.AppProperties;
import com.example.demo.security.SessionCookie;
import com.example.demo.security.SessionService;
import com.example.demo.service.AuthService;
import com.example.demo.service.CatalogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.JsonNode;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthController {

	private final AuthService auth;
	private final CatalogService catalog;
	private final SessionService sessions;
	private final AppProperties props;

	public AuthController(AuthService auth, CatalogService catalog, SessionService sessions, AppProperties props) {
		this.auth = auth;
		this.catalog = catalog;
		this.sessions = sessions;
		this.props = props;
	}

	@PostMapping("/api/auth/register")
	public Map<String, Object> register(HttpServletRequest request, HttpServletResponse response, @RequestBody JsonNode body) {
		return seal(request, response, auth.register(body));
	}

	@PostMapping("/api/auth/login")
	public Map<String, Object> login(HttpServletRequest request, HttpServletResponse response, @RequestBody JsonNode body) {
		return seal(request, response, auth.login(body));
	}

	@PostMapping("/api/auth/forgot")
	public Map<String, Object> forgot(@RequestBody JsonNode body) {
		return auth.forgot(body);
	}

	@PostMapping("/api/auth/google")
	public Map<String, Object> google(HttpServletRequest request, HttpServletResponse response, @RequestBody JsonNode body) {
		return seal(request, response, auth.google(body));
	}

	@DeleteMapping("/api/auth/session")
	public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
		String header = request.getHeader("Authorization");
		String token = header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)
				? header.substring(7).trim()
				: SessionCookie.read(request);
		sessions.revoke(token);
		SessionCookie.clear(request, response);
		return Map.of("ok", true);
	}

	@PostMapping("/api/auth/check-password")
	public Map<String, Object> checkPassword(Authentication authentication, @RequestBody JsonNode body) {
		return auth.checkPassword(email(authentication), body);
	}

	@PutMapping("/api/auth/profile")
	public Map<String, Object> profile(Authentication authentication, HttpServletRequest request, HttpServletResponse response, @RequestBody JsonNode body) {
		return seal(request, response, auth.updateProfile(email(authentication), body));
	}

	@GetMapping("/api/me")
	public Map<String, Object> me(Authentication authentication) {
		return auth.me(email(authentication));
	}

	@GetMapping("/api/users")
	public Map<String, Object> users(Authentication authentication) {
		return auth.adminUsers(email(authentication));
	}

	@PutMapping("/api/me/favs")
	public Map<String, Object> favs(Authentication authentication, @RequestBody JsonNode body) {
		return catalog.saveFavs(email(authentication), body);
	}

	@PutMapping("/api/me/notes")
	public Map<String, Object> notes(Authentication authentication, @RequestBody JsonNode body) {
		return catalog.saveNotes(email(authentication), body);
	}

	private Map<String, Object> seal(HttpServletRequest request, HttpServletResponse response, Map<String, Object> body) {
		Object token = body.remove("token");
		if (token instanceof String value && !value.isBlank()) {
			SessionCookie.write(request, response, value, props.getTokenDays());
		}
		return body;
	}

	static String email(Authentication authentication) {
		if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() == null) {
			throw new ApiException(401, "unauthorized", "შედით ანგარიშში");
		}
		return authentication.getName();
	}

}
