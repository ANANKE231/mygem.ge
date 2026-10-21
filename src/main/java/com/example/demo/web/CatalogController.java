package com.example.demo.web;

import com.example.demo.service.CatalogService;
import tools.jackson.databind.JsonNode;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class CatalogController {

	private final CatalogService catalog;

	public CatalogController(CatalogService catalog) {
		this.catalog = catalog;
	}

	@GetMapping("/api/listings")
	public Map<String, Object> listings(Authentication authentication) {
		return catalog.listings(viewer(authentication));
	}

	@PutMapping("/api/listings")
	public Map<String, Object> save(Authentication authentication, @RequestBody JsonNode body) {
		return catalog.saveListing(AuthController.email(authentication), body);
	}

	@DeleteMapping("/api/listings/{id}")
	public Map<String, Object> delete(Authentication authentication, @PathVariable long id) {
		return catalog.deleteListing(AuthController.email(authentication), id);
	}

	private static String viewer(Authentication authentication) {
		if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
			return null;
		}
		return authentication.getName();
	}

}
