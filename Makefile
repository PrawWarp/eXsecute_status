.PHONY: agent-verify agent-security

agent-verify: ## Run all agent verification checks
	npm test
	npm run type-check
	npm run lint
	@if command -v semgrep > /dev/null && [ -f .semgrep.yml ]; then \
		semgrep --config .semgrep.yml --error src/; \
	else \
		echo "Semgrep not available or .semgrep.yml not found — skipping"; \
	fi
	@if command -v gitleaks > /dev/null; then \
		gitleaks detect --no-git -v; \
	else \
		echo "Gitleaks not available — skipping"; \
	fi

agent-security: ## Run security-focused checks
	@if command -v semgrep > /dev/null; then \
		if [ -f .semgrep.yml ]; then \
			semgrep --config auto --config .semgrep.yml; \
		else \
			semgrep --config auto; \
		fi; \
	else \
		echo "Semgrep not available — skipping"; \
	fi
	@if command -v gitleaks > /dev/null; then \
		gitleaks detect --no-git -v; \
	else \
		echo "Gitleaks not available — skipping"; \
	fi
