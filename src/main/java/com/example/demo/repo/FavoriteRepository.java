package com.example.demo.repo;

import com.example.demo.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

	List<Favorite> findByEmailIgnoreCase(String email);

	void deleteByEmailIgnoreCase(String email);

}
