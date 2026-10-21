package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SiteSmokeTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void homePageLoads() throws Exception {
		mvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("mygem.ge")))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("/static/script.js")));
	}

	@Test
	void stylesAndScriptsLoad() throws Exception {
		mvc.perform(get("/static/style.css")).andExpect(status().isOk());
		mvc.perform(get("/static/script.js")).andExpect(status().isOk());
		mvc.perform(get("/images/hero-left.png")).andExpect(status().isOk());
	}

	@Test
	void publicReadsAreNotBlocked() throws Exception {
		mvc.perform(get("/api/listings")).andExpect(status().isOk());
		mvc.perform(get("/api/users")).andExpect(status().isOk());
		mvc.perform(get("/api/health")).andExpect(status().isOk());
		mvc.perform(post("/api/auth/login").contentType("application/json").content("{}")).andExpect(status().isBadRequest());
	}

	@Test
	void changingDataRequiresAToken() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/listings")).andExpect(status().isUnauthorized());
	}

}
