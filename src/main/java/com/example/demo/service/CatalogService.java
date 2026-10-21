package com.example.demo.service;

import com.example.demo.config.AppProperties;
import com.example.demo.model.Favorite;
import com.example.demo.model.ListingRecord;
import com.example.demo.model.UserNote;
import com.example.demo.repo.FavoriteRepository;
import com.example.demo.repo.ListingRepository;
import com.example.demo.repo.UserNoteRepository;
import com.example.demo.web.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CatalogService {

	private static final Logger log = LoggerFactory.getLogger(CatalogService.class);
	private static final int MAX_PAYLOAD = 30_000_000;
	private static final int MAX_NOTES = 200;
	private static final int MAX_FAVS = 500;

	private final ListingRepository listings;
	private final FavoriteRepository favorites;
	private final UserNoteRepository notes;
	private final AppProperties props;
	private final ObjectMapper json;

	public CatalogService(ListingRepository listings, FavoriteRepository favorites, UserNoteRepository notes, AppProperties props, ObjectMapper json) {
		this.listings = listings;
		this.favorites = favorites;
		this.notes = notes;
		this.props = props;
		this.json = json;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> listings(String viewer) {
		List<Object> out = new ArrayList<>();
		for (ListingRecord record : listings.findAll()) {
			Object listing = toPublicListing(record, viewer);
			if (listing != null) {
				out.add(listing);
			}
		}
		return Map.of("ok", true, "listings", out);
	}

	@Transactional
	public Map<String, Object> saveListing(String caller, JsonNode body) {
		if (caller == null || caller.isBlank()) {
			throw new ApiException(401, "unauthorized", "შედით ანგარიშში");
		}
		if (body == null || !body.isObject()) {
			throw new ApiException(400, "bad_request", "განცხადების მონაცემები არასწორია");
		}
		ObjectNode listing = (ObjectNode) body;
		if (!listing.path("id").isNumber()) {
			throw new ApiException(400, "bad_request", "განცხადების ნომერი აკლია");
		}
		long id = listing.path("id").asLong();
		if (id <= 0) {
			throw new ApiException(400, "bad_request", "განცხადების ნომერი აკლია");
		}
		boolean admin = props.isAdmin(caller);
		ListingRecord record = listings.findById(id).orElseGet(ListingRecord::new);
		boolean exists = record.getId() != null;
		String owner;
		if (exists) {
			owner = record.getOwnerEmail();
			if (!admin && !owner.equalsIgnoreCase(caller)) {
				throw new ApiException(403, "forbidden", "ამ განცხადების შეცვლა არ შეგიძლიათ");
			}
			if (!admin) {
				listing.put("owner", owner);
			} else {
				owner = listing.path("owner").asText(owner).trim().toLowerCase(Locale.ROOT);
				if (owner.isBlank()) {
					owner = record.getOwnerEmail();
				}
			}
		} else {
			owner = admin ? listing.path("owner").asText(caller).trim().toLowerCase(Locale.ROOT) : caller.toLowerCase(Locale.ROOT);
			if (owner.isBlank()) {
				owner = caller.toLowerCase(Locale.ROOT);
			}
			listing.put("owner", owner);
			record.setId(id);
		}
		if ("demo".equalsIgnoreCase(owner)) {
			throw new ApiException(400, "bad_request", "სადემონსტრაციო განცხადება სერვერზე არ ინახება");
		}
		String payload;
		try {
			payload = json.writeValueAsString(listing);
		} catch (Exception ex) {
			throw new ApiException(400, "bad_request", "განცხადების მონაცემები არასწორია");
		}
		if (payload.length() > MAX_PAYLOAD) {
			throw new ApiException(413, "too_large", "განცხადება ძალიან დიდია");
		}
		record.setOwnerEmail(owner);
		record.setPayload(payload);
		listings.save(record);
		return Map.of("ok", true, "id", id);
	}

	@Transactional
	public Map<String, Object> deleteListing(String caller, long id) {
		ListingRecord record = listings.findById(id).orElse(null);
		if (record == null) {
			return Map.of("ok", true);
		}
		boolean admin = props.isAdmin(caller);
		if (!admin && !record.getOwnerEmail().equalsIgnoreCase(caller)) {
			throw new ApiException(403, "forbidden", "ამ განცხადების წაშლა არ შეგიძლიათ");
		}
		listings.delete(record);
		return Map.of("ok", true);
	}

	@Transactional
	public void moveOwner(String from, String to) {
		for (ListingRecord record : listings.findByOwnerEmailIgnoreCase(from)) {
			try {
				ObjectNode listing = (ObjectNode) json.readTree(record.getPayload());
				listing.put("owner", to);
				record.setOwnerEmail(to);
				record.setPayload(json.writeValueAsString(listing));
			} catch (Exception ex) {
				log.warn("could not move listing {}", record.getId(), ex);
			}
		}
	}

	@Transactional(readOnly = true)
	public List<Long> favIds(String email) {
		return favorites.findByEmailIgnoreCase(email).stream().map(Favorite::getListingId).toList();
	}

	@Transactional
	public Map<String, Object> saveFavs(String email, JsonNode body) {
		if (body == null || !body.path("ids").isArray()) {
			throw new ApiException(400, "bad_request", "ფავორიტების სია არასწორია");
		}
		LinkedHashSet<Long> ids = new LinkedHashSet<>();
		body.path("ids").forEach(node -> {
			if (node.isNumber() && node.asLong() > 0 && ids.size() < MAX_FAVS) {
				ids.add(node.asLong());
			}
		});
		favorites.deleteByEmailIgnoreCase(email);
		favorites.flush();
		for (Long id : ids) {
			Favorite favorite = new Favorite();
			favorite.setEmail(email.toLowerCase(Locale.ROOT));
			favorite.setListingId(id);
			favorites.save(favorite);
		}
		return Map.of("ok", true, "favs", List.copyOf(ids));
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> notesFor(String email) {
		List<Map<String, Object>> out = new ArrayList<>();
		for (UserNote note : notes.findByEmailIgnoreCaseOrderByCreatedAtDesc(email)) {
			Map<String, Object> row = new LinkedHashMap<>();
			row.put("t", note.getText());
			row.put("d", note.getCreatedAt());
			row.put("r", note.getReadFlag());
			out.add(row);
		}
		return out;
	}

	@Transactional
	public Map<String, Object> saveNotes(String caller, JsonNode body) {
		JsonNode map = body == null ? null : body.get("notes");
		if (map == null || !map.isObject()) {
			throw new ApiException(400, "bad_request", "შეტყობინებების სია არასწორია");
		}
		String me = caller.toLowerCase(Locale.ROOT);
		map.forEachEntry((key, value) -> {
			String email = key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
			if (email.isBlank() || !value.isArray()) {
				return;
			}
			if (email.equals(me)) {
				replaceNotes(email, value);
			} else {
				appendNotes(email, value);
			}
		});
		return Map.of("ok", true, "notes", notesFor(me));
	}

	private void replaceNotes(String email, JsonNode list) {
		notes.deleteByEmailIgnoreCase(email);
		notes.flush();
		List<UserNote> rows = readNotes(email, list);
		if (rows.size() > MAX_NOTES) {
			rows = rows.subList(rows.size() - MAX_NOTES, rows.size());
		}
		notes.saveAll(rows);
	}

	private void appendNotes(String email, JsonNode list) {
		List<UserNote> existing = notes.findByEmailIgnoreCaseOrderByCreatedAtDesc(email);
		LinkedHashSet<String> seen = new LinkedHashSet<>();
		for (UserNote note : existing) {
			seen.add(note.getCreatedAt() + "\n" + note.getText());
		}
		List<UserNote> extra = new ArrayList<>();
		for (UserNote note : readNotes(email, list)) {
			String key = note.getCreatedAt() + "\n" + note.getText();
			if (seen.add(key)) {
				extra.add(note);
			}
		}
		if (!extra.isEmpty()) {
			notes.saveAll(extra);
		}
	}

	private List<UserNote> readNotes(String email, JsonNode list) {
		List<UserNote> rows = new ArrayList<>();
		list.forEach(node -> {
			String text = node.path("t").asText("").trim();
			if (text.isBlank()) {
				return;
			}
			if (text.length() > 2000) {
				text = text.substring(0, 2000);
			}
			UserNote note = new UserNote();
			note.setEmail(email);
			note.setText(text);
			note.setCreatedAt(node.path("d").asLong(System.currentTimeMillis()));
			note.setReadFlag(node.path("r").asInt(0) == 0 ? 0 : 1);
			rows.add(note);
		});
		return rows;
	}

	private Object toPublicListing(ListingRecord record, String viewer) {
		try {
			JsonNode tree = json.readTree(record.getPayload());
			if (!(tree instanceof ObjectNode listing)) {
				return null;
			}
			boolean full = viewer != null && (props.isAdmin(viewer) || record.getOwnerEmail().equalsIgnoreCase(viewer));
			if (!full && listing.get("pay") instanceof ObjectNode pay) {
				pay.remove("receipt");
				pay.remove("receiptName");
				pay.remove("receiptType");
			}
			return json.convertValue(listing, Object.class);
		} catch (Exception ex) {
			log.warn("skipping listing {}", record.getId(), ex);
			return null;
		}
	}

}
