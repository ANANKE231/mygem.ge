package com.example.demo.service;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlittSignatureTest {

	@Test
	void matchesFlittDocumentationExample() {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("server_callback_url", "http://myshop/callback/");
		params.put("order_id", "TestOrder2");
		params.put("currency", "GEL");
		params.put("merchant_id", 1549901);
		params.put("order_desc", "Test payment");
		params.put("amount", 1000);
		/* Flitt docs list a sample hex that does not match SHA-1 of their own example string;
		   the algorithm (secret|sorted values) is what the gateway verifies. */
		assertEquals("cd0edb710cbbdb6c2a4d965cdb91fdfabc343215", FlittSignature.sign("test", params));
		assertTrue(FlittSignature.matches("test", params, "cd0edb710cbbdb6c2a4d965cdb91fdfabc343215"));
	}
}
