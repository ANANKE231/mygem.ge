package com.example.demo;

import com.example.demo.model.ListingRecord;
import com.example.demo.repo.ListingRepository;
import com.example.demo.service.FlittSignature;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
		"app.flitt-merchant-id=1549901",
		"app.flitt-payment-key=test",
		"app.public-base-url=http://localhost"
})
class FlittPaymentTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private ListingRepository listings;

	@Test
	void approvedCallbackActivatesVip() throws Exception {
		String seller = token(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
				{"regType":"individual","name":"გიორგი","last":"გელაშვილი","email":"flitt@test.com","username":"flittuser","phone":"555444333","pass":"secret12"}
				""")).andExpect(status().isOk()).andReturn());

		String payload = """
				{"id":88042,"title":"ოქროს ბეჭედი","desc":"სატესტო აღწერა აქ არის","type":"ring","weight":3,"price":100,"loc":"თბილისი","photos":[],"attrs":{"metal":"ოქრო","pur":"585"},"owner":"flitt@test.com","hold":true,"pay":{"plan":"VIP","days":3,"color":false,"sticker":false,"stickers":[],"stkN":0,"amount":2,"status":"pending","created":1,"flittOrderId":"mygem-88042-test","provider":"flitt"}}
				""";
		ListingRecord record = new ListingRecord();
		record.setId(88042L);
		record.setOwnerEmail("flitt@test.com");
		record.setPayload(payload);
		listings.save(record);

		Map<String, Object> callback = new LinkedHashMap<>();
		callback.put("order_id", "mygem-88042-test");
		callback.put("merchant_id", 1549901);
		callback.put("amount", "200");
		callback.put("currency", "GEL");
		callback.put("order_status", "approved");
		callback.put("response_status", "success");
		callback.put("payment_id", "999");
		callback.put("signature", FlittSignature.sign("test", callback));

		String body = """
				{"order_id":"mygem-88042-test","merchant_id":1549901,"amount":"200","currency":"GEL","order_status":"approved","response_status":"success","payment_id":"999","signature":"%s"}
				""".formatted(FlittSignature.sign("test", callback));
		mvc.perform(post("/api/payments/flitt/callback").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ok").value(true))
				.andExpect(jsonPath("$.status").value("active"));

		mvc.perform(get("/api/listings").header("Authorization", "Bearer " + seller))
				.andExpect(jsonPath("$.listings[?(@.id == 88042)].vip").value(org.hamcrest.Matchers.contains("VIP")))
				.andExpect(jsonPath("$.listings[?(@.id == 88042)].pay.status").value(org.hamcrest.Matchers.contains("active")));

		mvc.perform(get("/api/payments/config"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ready").value(true));

		listings.deleteById(88042L);
	}

	private String token(MvcResult result) {
		String header = result.getResponse().getHeader("Set-Cookie");
		if (header == null || !header.startsWith("mygem_session=")) {
			throw new AssertionError("missing session cookie");
		}
		return header.substring("mygem_session=".length()).split(";", 2)[0];
	}
}
