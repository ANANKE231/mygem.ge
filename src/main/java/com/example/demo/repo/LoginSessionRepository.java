package com.example.demo.repo;

import com.example.demo.model.LoginSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginSessionRepository extends JpaRepository<LoginSession, String> {

	void deleteByEmailIgnoreCase(String email);

}
