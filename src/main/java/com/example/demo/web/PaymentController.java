package com.example.demo.web;

import com.example.demo.service.CatalogService;
import com.example.demo.service.FlittService;
import tools.jackson.databind.JsonNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class PaymentController {

	private final CatalogService catalog;
	private final FlittService flitt;

	public PaymentController(CatalogService catalog, FlittService flitt) {
		this.catalog = catalog;
		this.flitt = flitt;
	}

	@GetMapping("/api/payments/config")
	public Map<String, Object> config() {
		return flitt.config();
	}

	@PostMapping("/api/payments/checkout")
	public Map<String, Object> checkout(Authentication authentication, @RequestBody JsonNode body) {
		long listingId = body == null ? 0 : body.path("listingId").asLong(0);
		if (listingId <= 0) {
			throw new ApiException(400, "bad_request", "განცხადების ნომერი აკლია");
		}
		return catalog.beginFlittCheckout(AuthController.email(authentication), listingId, flitt);
	}

	@PostMapping(value = "/api/payments/flitt/callback", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE, MediaType.ALL_VALUE})
	public ResponseEntity<Map<String, Object>> callback(@RequestBody(required = false) JsonNode body, @RequestParam Map<String, String> form) {
		Map<String, Object> params = new LinkedHashMap<>();
		if (form != null) {
			params.putAll(form);
		}
		if (body != null && body.isObject()) {
			body.properties().forEach(entry -> {
				JsonNode value = entry.getValue();
				if (value == null || value.isNull()) {
					return;
				}
				if (value.isNumber() || value.isBoolean() || value.isTextual()) {
					params.put(entry.getKey(), value.isNumber() ? value.numberValue() : value.isBoolean() ? value.booleanValue() : value.asText());
				} else {
					params.put(entry.getKey(), value.toString());
				}
			});
		}
		return ResponseEntity.ok(catalog.applyFlittCallback(params, flitt));
	}

	/**
	 * Flitt აბრუნებს მომხმარებელს აქ (ჩვეულებრივ POST-ით). ეს მხოლოდ ეკრანისთვისაა:
	 * სტატუსს ნამდვილად ააქტიურებს /api/payments/flitt/callback (ხელმოწერით).
	 */
	@RequestMapping(value = "/pay/return", method = {RequestMethod.GET, RequestMethod.POST})
	public ResponseEntity<Void> payReturn(@RequestParam(required = false) Map<String, String> params) {
		String status = params == null ? "" : params.getOrDefault("order_status", "");
		String state = "approved".equalsIgnoreCase(status) ? "ok" : "pending";
		return ResponseEntity.status(HttpStatus.SEE_OTHER)   // 303: POST გადადის GET-ში
				.header(HttpHeaders.LOCATION, "/#home")
				.header(HttpHeaders.CACHE_CONTROL, "no-store")
				.build();
	}
}