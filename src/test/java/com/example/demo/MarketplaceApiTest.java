package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

		String approved = """
				{"id":42,"title":"ოქროს ბეჭედი","owner":"ana@test.com","price":100,"vip":"VIP","pay":{"status":"active","amount":2,"receipt":"data:image/png;base64,SECRET"}}
				""";
		mvc.perform(put("/api/listings").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content(approved))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings"))
				.andExpect(jsonPath("$.listings[0].vip").value("VIP"))
				.andExpect(jsonPath("$.listings[0].pay.status").value("active"))
				.andExpect(jsonPath("$.listings[0].pay.receipt").doesNotExist());

		mvc.perform(put("/api/me/favs").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"ids\":[42,42]}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.favs[0]").value(42));
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + buyer))
				.andExpect(jsonPath("$.favs[0]").value(42));

		mvc.perform(put("/api/me/notes").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"notes\":{\"ana@test.com\":[{\"t\":\"გამარჯობა\",\"d\":10,\"r\":0}]}}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.notes[0].t").value("გამარჯობა"));
		mvc.perform(put("/api/me/notes").header("Authorization", "Bearer " + buyer).contentType(MediaType.APPLICATION_JSON)
						.content("{\"notes\":{\"ana@test.com\":[]}}"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/me").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.notes[0].t").value("გამარჯობა"));

		mvc.perform(post("/api/auth/forgot").contentType(MediaType.APPLICATION_JSON)
						.content("{\"email\":\"ana@test.com\",\"password\":\"newpass12\"}"))
				.andExpect(status().isOk());
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"login\":\"ana\",\"password\":\"secret12\"}"))
				.andExpect(status().isUnauthorized());
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"login\":\"ana@test.com\",\"password\":\"newpass12\"}"))
				.andExpect(status().isOk());

		mvc.perform(delete("/api/listings/42").header("Authorization", "Bearer " + buyer))
				.andExpect(status().isForbidden());
		mvc.perform(delete("/api/listings/42").header("Authorization", "Bearer " + seller))
				.andExpect(status().isOk());
		mvc.perform(get("/api/listings")).andExpect(jsonPath("$.listings.length()").value(0));
	}

	private MvcResult register(String json) throws Exception {
		return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty())
				.andExpect(jsonPath("$.user.hasPass").value(true))
				.andReturn();
	}

	private String token(MvcResult result) throws Exception {
		String body = result.getResponse().getContentAsString();
		int at = body.indexOf("\"token\":\"");
		int from = at + "\"token\":\"".length();
		return body.substring(from, body.indexOf('"', from));
	}

}
