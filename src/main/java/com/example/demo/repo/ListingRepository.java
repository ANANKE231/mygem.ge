package com.example.demo.repo;

import com.example.demo.model.ListingRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListingRepository extends JpaRepository<ListingRecord, Long> {

	List<ListingRecord> findByOwnerEmailIgnoreCase(String ownerEmail);

}
