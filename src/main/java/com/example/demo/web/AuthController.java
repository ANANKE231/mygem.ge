package com.example.demo.web;

import com.example.demo.service.AuthService;
import com.example.demo.service.CatalogService;
import tools.jackson.databind.JsonNode;
import org.springframework.security.core.Authentication;
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

	public AuthController(AuthService auth, CatalogService catalog) {
		this.auth = auth;
		this.catalog = catalog;
	}

	@PostMapping("/api/auth/register")
	public Map<String, Object> register(@RequestBody JsonNode body) {
		return auth.register(body);
	}

	@PostMapping("/api/auth/login")
	public Map<String, Object> login(@RequestBody JsonNode body) {
		return auth.login(body);
	}

	@PostMapping("/api/auth/forgot")
	public Map<String, Object> forgot(@RequestBody JsonNode body) {
		return auth.forgot(body);
	}

	@PostMapping("/api/auth/check-password")
	public Map<String, Object> checkPassword(Authentication authentication, @RequestBody JsonNode body) {
		return auth.checkPassword(email(authentication), body);
	}

	@PutMapping("/api/auth/profile")
	public Map<String, Object> profile(Authentication authentication, @RequestBody JsonNode body) {
		return auth.updateProfile(email(authentication), body);
	}

	@GetMapping("/api/me")
	public Map<String, Object> me(Authentication authentication) {
		return auth.me(email(authentication));
	}

	@GetMapping("/api/users")
	public Map<String, Object> users() {
		return auth.publicUsers();
	}

	@PutMapping("/api/me/favs")
	public Map<String, Object> favs(Authentication authentication, @RequestBody JsonNode body) {
		return catalog.saveFavs(email(authentication), body);
	}

	@PutMapping("/api/me/notes")
	public Map<String, Object> notes(Authentication authentication, @RequestBody JsonNode body) {
		return catalog.saveNotes(email(authentication), body);
	}

	static String email(Authentication authentication) {
		if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() == null) {
			throw new ApiException(401, "unauthorized", "შედით ანგარიშში");
		}
		return authentication.getName();
	}

}
