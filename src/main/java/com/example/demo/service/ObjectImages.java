package com.example.demo.service;

import com.example.demo.web.ApiException;
import com.example.demo.web.MediaUrls;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ObjectImages {

	public record PhotoChange(List<String> removed, List<String> uploaded) {
	}

	private final R2Storage storage;
	private final ObjectMapper json;

	public ObjectImages(R2Storage storage, ObjectMapper json) {
		this.storage = storage;
		this.json = json;
	}

	public boolean enabled() {
		return storage.enabled();
	}

	public String clientUrl(String stored) {
		return storage.clientUrl(stored);
	}

	public boolean hasDataPhoto(ObjectNode listing) {
		JsonNode photos = listing.get("photos");
		if (photos == null || !photos.isArray()) {
			return false;
		}
		for (JsonNode node : photos) {
			if (node.isTextual() && node.asText().startsWith("data:image/")) {
				return true;
			}
		}
		return false;
	}

	public PhotoChange stageListingPhotos(ObjectNode listing, long listingId, String oldPayload) {
		if (!storage.enabled()) {
			return new PhotoChange(List.of(), List.of());
		}
		JsonNode photos = listing.get("photos");
		if (photos == null || !photos.isArray()) {
			return new PhotoChange(List.of(), List.of());
		}
		Set<String> previous = listingKeys(oldPayload);
		Set<String> kept = new LinkedHashSet<>();
		List<String> uploaded = new ArrayList<>();
		ArrayNode clean = json.createArrayNode();
		try {
			for (JsonNode node : photos) {
				if (clean.size() >= 8) {
					break;
				}
				if (!node.isTextual()) {
					continue;
				}
				Stored stored = storeListingPhoto(node.asText(), listingId);
				if (stored == null) {
					continue;
				}
				clean.add(stored.value());
				if (stored.uploaded()) {
					uploaded.add(stored.value());
				}
				if (MediaUrls.objectKey(stored.value())) {
					kept.add(stored.value());
				}
			}
		} catch (RuntimeException ex) {
			deleteAll(uploaded);
			throw ex;
		}
		listing.set("photos", clean);
		List<String> removed = new ArrayList<>();
		for (String key : previous) {
			if (!kept.contains(key)) {
				removed.add(key);
			}
		}
		return new PhotoChange(List.copyOf(removed), List.copyOf(uploaded));
	}

	public List<String> clientPhotos(ObjectNode listing) {
		List<String> out = new ArrayList<>();
		JsonNode photos = listing.get("photos");
		if (photos != null && photos.isArray()) {
			for (JsonNode node : photos) {
				if (node.isTextual()) {
					out.add(storage.clientUrl(node.asText()));
				}
			}
		}
		return out;
	}

	public void expandPhotos(ObjectNode listing) {
		if (!storage.enabled()) {
			return;
		}
		JsonNode photos = listing.get("photos");
		if (photos == null || !photos.isArray()) {
			return;
		}
		ArrayNode expanded = json.createArrayNode();
		for (JsonNode node : photos) {
			if (node.isTextual()) {
				expanded.add(storage.clientUrl(node.asText()));
			}
		}
		listing.set("photos", expanded);
	}

	public void deleteAll(List<String> keys) {
		if (keys == null) {
			return;
		}
		for (String key : keys) {
			storage.delete(key);
		}
	}

	public void deleteListingPhotos(String payload) {
		if (!storage.enabled()) {
			return;
		}
		deleteAll(List.copyOf(listingKeys(payload)));
	}

	public String storeAvatar(String value, long accountId, String previous) {
		String current = previous == null ? "" : previous;
		if (value == null || value.isBlank()) {
			deleteOwnedAvatar(current, accountId);
			return "";
		}
		String key = storage.keyFrom(value);
		if (key != null) {
			if (!key.startsWith("avatars/" + accountId + "/")) {
				throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
			}
			return key;
		}
		if (value.startsWith("https://")) {
			if (!MediaUrls.avatar(value)) {
				throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
			}
			if (!current.equals(value)) {
				deleteOwnedAvatar(current, accountId);
			}
			return value;
		}
		Decoded image = decode(value);
		String created = "avatars/" + accountId + "/" + uuid() + "." + image.ext();
		storage.put(created, image.bytes(), image.type());
		if (!current.equals(created)) {
			deleteOwnedAvatar(current, accountId);
		}
		return created;
	}

	private Stored storeListingPhoto(String value, long listingId) {
		if (value == null || value.isBlank()) {
			return null;
		}
		String key = storage.keyFrom(value);
		if (key != null) {
			return key.startsWith("listings/" + listingId + "/") ? new Stored(key, false) : null;
		}
		if (value.startsWith("/images/") && MediaUrls.image(value)) {
			return new Stored(value, false);
		}
		if (value.startsWith("data:")) {
			Decoded image = decode(value);
			String created = "listings/" + listingId + "/" + uuid() + "." + image.ext();
			storage.put(created, image.bytes(), image.type());
			return new Stored(created, true);
		}
		return null;
	}

	private Set<String> listingKeys(String payload) {
		Set<String> keys = new LinkedHashSet<>();
		if (payload == null || payload.isBlank()) {
			return keys;
		}
		try {
			JsonNode tree = json.readTree(payload);
			JsonNode photos = tree.get("photos");
			if (photos != null && photos.isArray()) {
				for (JsonNode node : photos) {
					if (!node.isTextual()) {
						continue;
					}
					String key = storage.keyFrom(node.asText());
					if (key != null && key.startsWith("listings/")) {
						keys.add(key);
					}
				}
			}
		} catch (Exception ignored) {
			return keys;
		}
		return keys;
	}

	private void deleteOwnedAvatar(String value, long accountId) {
		String key = storage.keyFrom(value);
		if (key != null && key.startsWith("avatars/" + accountId + "/")) {
			storage.delete(key);
		}
	}

	private Decoded decode(String value) {
		if (value.length() > 8_000_000) {
			throw new ApiException(413, "too_large", "ფოტო ძალიან დიდია");
		}
		int comma = value.indexOf(',');
		if (comma < 0 || comma > 64 || !value.startsWith("data:image/")) {
			throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
		}
		String header = value.substring("data:".length(), comma);
		if (!header.endsWith(";base64")) {
			throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
		}
		String mime = header.substring(0, header.length() - ";base64".length());
		String ext = switch (mime) {
			case "image/jpeg" -> "jpg";
			case "image/png" -> "png";
			case "image/webp" -> "webp";
			default -> null;
		};
		if (ext == null) {
			throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
		}
		byte[] bytes;
		try {
			bytes = Base64.getMimeDecoder().decode(value.substring(comma + 1));
		} catch (IllegalArgumentException ex) {
			throw new ApiException(400, "bad_request", "ფოტოს ფორმატი არასწორია");
		}
		if (bytes.length == 0 || bytes.length > 6_000_000) {
			throw new ApiException(413, "too_large", "ფოტო ძალიან დიდია");
		}
		return new Decoded(bytes, mime, ext);
	}

	private static String uuid() {
		return UUID.randomUUID().toString().replace("-", "");
	}

	private record Stored(String value, boolean uploaded) {
	}

	private record Decoded(byte[] bytes, String type, String ext) {
	}

}
