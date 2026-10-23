package com.example.demo.web;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

	@GetMapping({"/", "/index.html"})
	public ResponseEntity<Resource> index() {
		return page("templates/index.html");
	}

	@GetMapping({"/admin", "/admin/"})
	public ResponseEntity<Resource> admin() {
		return page("templates/admin.html");
	}

	private ResponseEntity<Resource> page(String classpath) {
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
				.body(new ClassPathResource(classpath));
	}

}
