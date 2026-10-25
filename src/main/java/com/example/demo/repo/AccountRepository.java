package com.example.demo.repo;

import com.example.demo.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

	Optional<Account> findByEmailIgnoreCase(String email);

	Optional<Account> findByGoogleSub(String googleSub);

	Optional<Account> findByUsernameIgnoreCase(String username);

	boolean existsByEmailIgnoreCase(String email);

	boolean existsByUsernameIgnoreCase(String username);

	boolean existsByPhoneKey(String phoneKey);

	@Query("select count(a) > 0 from Account a where a.phoneKey = :key and a.id <> :id")
	boolean phoneKeyTaken(@Param("key") String key, @Param("id") Long id);

}
