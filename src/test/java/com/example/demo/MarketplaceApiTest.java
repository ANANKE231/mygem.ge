package com.example.demo;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MarketplaceApiTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void accountsListingsFavoritesAndNotes() throws Exception {
		String seller = token(register("""
				{"regType":"individual","name":"ანა","last":"ბერიძე","email":"ana@test.com","username":"ana","phone":"555123456","pass":"secret12"}
				"""));
		String buyer = token(register("""
				{"regType":"store","name":"მაღაზია","email":"shop@test.com","username":"shop","phone":"555987654","pass":"secret12"}
				"""));
		String admin = token(register("""
				{"regType":"individual","name":"ადმინი","last":"ადმინი","email":"mygemge@gmail.com","username":"mygem","phone":"555000111","pass":"Admin1234"}
				"""));

		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.email").value("ana@test.com"))
				.andExpect(jsonPath("$.user.pass").doesNotExist())
				.andExpect(jsonPath("$.admin").value(false));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + admin))
				.andExpect(jsonPath("$.admin").value(true));

		String listing = """
				{"id":42,"title":"ოქროს ბეჭედი","owner":"someone-else@test.com","price":100,"pay":{"status":"pending","amount":2,"receipt":"data:image/png;base64,SECRET","receiptName":"r.png","receiptType":"image/png"}}
				""";
		mvc.perform(put("/api/listings").contentType(MediaType.APPLICATION_JSON).content(listing))
				.andExpect(status().isUnauthorized());
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON).content(listing))
				.andExpect(status().isOk());

		mvc.perform(get("/api/listings"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.listings[0].owner").value("ana@test.com"))
				.andExpect(jsonPath("$.listings[0].pay.receipt").doesNotExist())
				.andExpect(jsonPath("$.listings[0].pay.status").value("pending"));
		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[0].pay.receipt").value("data:image/png;base64,SECRET"));
		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + buyer))
				.andExpect(jsonPath("$.listings[0].pay.receipt").doesNotExist());

		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON).content(listing))
				.andExpect(status().isForbidden());

		String spoof = """
				{"id":42,"title":"ოქროს ბეჭედი","owner":"ana@test.com","price":100,"vip":"VIP","pay":{"status":"active","amount":2,"receipt":"data:image/png;base64,SECRET"}}
				""";
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON).content(spoof))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings"))
				.andExpect(jsonPath("$.listings[0].vip").doesNotExist())
				.andExpect(jsonPath("$.listings[0].pay.status").value("pending"));

		String approved = """
				{"id":42,"title":"ოქროს ბეჭედი","owner":"ana@test.com","price":100,"vip":"VIP","pay":{"status":"active","amount":2,"receipt":"data:image/png;base64,SECRET"}}
				""";
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content(approved))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings"))
				.andExpect(jsonPath("$.listings[0].vip").value("VIP"))
				.andExpect(jsonPath("$.listings[0].pay.status").value("active"))
				.andExpect(jsonPath("$.listings[0].pay.receipt").doesNotExist());

		String photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//2wBDAf//wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";
		String paid = """
				{"id":77,"title":"VIP ბეჭედი","price":50,"photos":["%s"],"pay":{"plan":"VIP","days":7,"amount":10,"receipt":"data:image/png;base64,SECRET","receiptName":"r.png","receiptType":"image/png","status":"pending"}}
				""".formatted(photo);
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON).content(paid))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photos[0]").value(photo));
		String cleared = """
				{"id":77,"title":"VIP ბეჭედი","owner":"ana@test.com","price":50,"photos":[],"vip":"VIP","pay":{"plan":"VIP","status":"active","amount":10,"receipt":"data:image/png;base64,SECRET"}}
				""";
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content(cleared))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photos[0]").value(photo));
		mvc.perform(get("/api/listings"))
				.andExpect(jsonPath("$.listings[?(@.id == 77)].vip").value(org.hamcrest.Matchers.contains("VIP")))
				.andExpect(jsonPath("$.listings[?(@.id == 77)].photos[0]").value(org.hamcrest.Matchers.contains(photo)));

		mvc.perform(put("/api/me/favs").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"ids\":[42,42]}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.favs[0]").value(42));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + buyer))
				.andExpect(jsonPath("$.favs[0]").value(42));

		mvc.perform(put("/api/me/notes").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"notes\":{\"ana@test.com\":[{\"t\":\"გამარჯობა\",\"d\":10,\"r\":0,\"listingId\":42}]}}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.notes[0].t").value("გამარჯობა"));
		mvc.perform(put("/api/me/notes").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"notes\":{\"ana@test.com\":[]}}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.notes[0].t").value("გამარჯობა"));
		mvc.perform(put("/api/me/notes").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"notes\":{\"mygemge@gmail.com\":[{\"t\":\"spam\",\"d\":11,\"r\":0}]}}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + admin))
				.andExpect(jsonPath("$.notes.length()").value(0));

		mvc.perform(post("/api/auth/check-password").cookie(new Cookie("mygem_session", seller))
						.contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"secret12\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(post("/api/auth/check-password").cookie(new Cookie("mygem_session", seller))
						.header("X-MyGem", "1").contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"secret12\"}"))
				.andExpect(status().isOk());

		mvc.perform(post("/api/auth/forgot").contentType(MediaType.APPLICATION_JSON)
						.content("{\"email\":\"ana@test.com\",\"password\":\"newpass12\"}"))
				.andExpect(status().isOk());
		MvcResult again = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"login\":\"ana\",\"password\":\"secret12\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.pass").doesNotExist())
				.andExpect(jsonPath("$.user.google").doesNotExist())
				.andReturn();
		seller = token(again);
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"login\":\"ana@test.com\",\"password\":\"newpass12\"}"))
				.andExpect(status().isUnauthorized());

		mvc.perform(get("/api/users"))
				.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/users").header("Authorization", "Bearer " + buyer))
				.andExpect(status().isForbidden());
		mvc.perform(get("/api/users").header("Authorization", "Bearer " + admin))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.users[0].pass").doesNotExist())
				.andExpect(jsonPath("$.users[0].google").doesNotExist());
		mvc.perform(get("/api/health"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().exists("Content-Security-Policy"));

		long beforeRenew = System.currentTimeMillis();
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"id":42,"title":"ოქროს ბეჭედი ახალი","price":120,"state":"blocked","vip":"SUPER VIP","renewedAt":9999999999999}
								"""))
				.andExpect(status().isOk());
		MvcResult renewed = mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].title").value(org.hamcrest.Matchers.contains("ოქროს ბეჭედი ახალი")))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].vip").value(org.hamcrest.Matchers.contains("VIP")))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].state").value(org.hamcrest.Matchers.empty()))
				.andReturn();
		Object stamp = ((java.util.List<?>) com.jayway.jsonpath.JsonPath.read(renewed.getResponse().getContentAsString(), "$.listings[?(@.id == 42)].renewedAt")).get(0);
		long renewedAt = ((Number) stamp).longValue();
		org.junit.jupiter.api.Assertions.assertTrue(renewedAt >= beforeRenew && renewedAt < 9_000_000_000_000L);
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("{\"id\":42,\"title\":\"ოქროს ბეჭედი ახალი\",\"renewedAt\":" + (renewedAt + 1000) + "}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].renewedAt").value(org.hamcrest.Matchers.contains(renewedAt)));
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("{\"id\":42,\"title\":\"ოქროს ბეჭედი ახალი\",\"state\":\"off\"}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].state").value(org.hamcrest.Matchers.contains("off")))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].hold").value(org.hamcrest.Matchers.contains(true)));
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("{\"id\":42,\"title\":\"ოქროს ბეჭედი ახალი\",\"state\":\"\"}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].state").value(org.hamcrest.Matchers.empty()))
				.andExpect(jsonPath("$.listings[?(@.id == 42)].hold").value(org.hamcrest.Matchers.empty()));

		mvc.perform(delete("/api/listings/42").header("Authorization", "Bearer " + buyer))
				.andExpect(status().isForbidden());
		mvc.perform(delete("/api/listings/42").header("Authorization", "Bearer " + seller))
				.andExpect(status().isOk());
		mvc.perform(delete("/api/listings/77").header("Authorization", "Bearer " + seller))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings")).andExpect(jsonPath("$.listings.length()").value(0));
	}

	@Test
	void profilePhotoIsStoredOnTheAccount() throws Exception {
		String seller = token(register("""
				{"regType":"individual","name":"ნინო","last":"გელაშვილი","email":"nino@test.com","username":"nino","phone":"555222333","pass":"secret12"}
				"""));
		String avatar = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//2wBDAf//wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";
		seller = token(mvc.perform(put("/api/auth/profile").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("{\"avatar\":\"" + avatar + "\",\"avatarOff\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.avatar").value(avatar))
				.andReturn());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.user.avatar").value(avatar));
		mvc.perform(put("/api/auth/profile").header("Authorization", "Bearer " + seller).contentType(MediaType.APPLICATION_JSON)
						.content("{\"avatar\":\"\",\"avatarOff\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.avatar").value(""));
	}

	@Test
	void googleSignInNeedsAClientId() throws Exception {
		mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"auth_config\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ok").value(true))
				.andExpect(jsonPath("$.ready").value(false))
				.andExpect(jsonPath("$.clientId").value(""));
		mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"google_auth\",\"credential\":\"a.b.c\"}"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.error").value("google_not_configured"));
	}

	private MvcResult register(String json) throws Exception {
		return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").doesNotExist())
				.andExpect(header().string("Set-Cookie", containsString("mygem_session=")))
				.andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
				.andExpect(jsonPath("$.user.hasPass").value(true))
				.andReturn();
	}

	private String token(MvcResult result) {
		String header = result.getResponse().getHeader("Set-Cookie");
		if (header == null || !header.startsWith("mygem_session=")) {
			throw new AssertionError("missing session cookie");
		}
		int from = "mygem_session=".length();
		int semi = header.indexOf(';', from);
		return java.net.URLDecoder.decode(header.substring(from, semi < 0 ? header.length() : semi), java.nio.charset.StandardCharsets.UTF_8);
	}

}
