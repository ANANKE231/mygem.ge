package com.example.demo.service;

import com.example.demo.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class R2StorageTest {

	@Test
	void publicUrlsRoundTripToObjectKeys() {
		AppProperties props = new AppProperties();
		props.setR2AccessKeyId("test-access-key");
		props.setR2SecretAccessKey("test-secret-key");
		props.setR2Endpoint("https://example.r2.cloudflarestorage.com");
		props.setR2Bucket("mygem");
		props.setR2PublicBase("https://pub-example.r2.dev/");
		R2Storage storage = new R2Storage(props);
		storage.enableForTest();
		String key = "listings/42/0123456789abcdef0123456789abcdef.jpg";
		assertEquals(key, storage.keyFrom("https://pub-example.r2.dev/" + key));
		assertEquals(key, storage.keyFrom(key));
		assertEquals("https://pub-example.r2.dev/" + key, storage.clientUrl(key));
		assertEquals("https://lh3.googleusercontent.com/a/picture", storage.clientUrl("https://lh3.googleusercontent.com/a/picture"));
		assertNull(storage.keyFrom("https://evil.example/" + key));
		assertNull(storage.keyFrom("listings/42/../secret.jpg"));
	}

}
