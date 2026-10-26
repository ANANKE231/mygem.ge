package com.example.demo.service;

import com.example.demo.model.Account;
import com.example.demo.model.ListingRecord;
import com.example.demo.repo.AccountRepository;
import com.example.demo.repo.ListingRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class MediaMigration implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(MediaMigration.class);

	private final ObjectImages images;
	private final ListingRepository listings;
	private final AccountRepository accounts;
	private final ObjectMapper json;
	private final TransactionTemplate tx;

	public MediaMigration(ObjectImages images, ListingRepository listings, AccountRepository accounts, ObjectMapper json, PlatformTransactionManager transactions) {
		this.images = images;
		this.listings = listings;
		this.accounts = accounts;
		this.json = json;
		this.tx = new TransactionTemplate(transactions);
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!images.enabled()) {
			return;
		}
		for (ListingRecord record : listings.findAll()) {
			try {
				moveListing(record.getId());
			} catch (Exception ex) {
				log.warn("could not move listing {} photos", record.getId());
			}
		}
		for (Account account : accounts.findAll()) {
			try {
				moveAvatar(account.getId());
			} catch (Exception ex) {
				log.warn("could not move profile photo {}", account.getId());
			}
		}
	}

	private void moveListing(Long id) {
		if (id == null) {
			return;
		}
		tx.executeWithoutResult(status -> {
			ListingRecord record = listings.findById(id).orElse(null);
			if (record == null || record.getPayload() == null) {
				return;
			}
			JsonNode tree;
			try {
				tree = json.readTree(record.getPayload());
			} catch (Exception ex) {
				return;
			}
			if (!(tree instanceof ObjectNode listing) || !images.hasDataPhoto(listing)) {
				return;
			}
			ObjectImages.PhotoChange change = images.stageListingPhotos(listing, id, record.getPayload());
			try {
				record.setPayload(json.writeValueAsString(listing));
			} catch (Exception ex) {
				images.deleteAll(change.uploaded());
				throw new IllegalStateException(ex);
			}
			listings.save(record);
			images.deleteAll(change.removed());
			log.info("moved listing {} photos to storage", id);
		});
	}

	private void moveAvatar(Long id) {
		if (id == null) {
			return;
		}
		tx.executeWithoutResult(status -> {
			Account account = accounts.findById(id).orElse(null);
			if (account == null || account.getAvatar() == null || !account.getAvatar().startsWith("data:image/")) {
				return;
			}
			account.setAvatar(images.storeAvatar(account.getAvatar(), account.getId(), account.getAvatar()));
			accounts.save(account);
			log.info("moved profile photo {} to storage", id);
		});
	}

}
