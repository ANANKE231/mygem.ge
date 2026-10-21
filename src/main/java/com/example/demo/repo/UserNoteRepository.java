package com.example.demo.repo;

import com.example.demo.model.UserNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserNoteRepository extends JpaRepository<UserNote, Long> {

	List<UserNote> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

	void deleteByEmailIgnoreCase(String email);

}
