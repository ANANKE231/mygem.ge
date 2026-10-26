package com.example.demo.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "R2_ACCESS_KEY_ID", matches = ".+")
class R2LiveTest {

	@Autowired
	private R2Storage storage;

	@Test
	void uploadedPhotoIsReadableFromThePublicAddress() throws Exception {
		assertTrue(storage.enabled());
		byte[] png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
		String key = "listings/1/0123456789abcdef0123456789abcdef.png";
		storage.put(key, png, "image/png");
		try {
			HttpRequest request = HttpRequest.newBuilder(URI.create(storage.clientUrl(key))).GET().timeout(Duration.ofSeconds(20)).build();
			HttpResponse<byte[]> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofByteArray());
			assertEquals(200, response.statusCode());
			assertArrayEquals(png, response.body());
		} finally {
			storage.delete(key);
		}
	}

}
