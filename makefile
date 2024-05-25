.PHONY: build dev

build:
	cd build-tool/ && cargo run --release
	$(MAKE) minify

dev:
	cd build-tool/ && cargo watch --watch . --watch ../src/ -- $(MAKE) --directory .. build

minify:
	find build/ -name \*.js | xargs -I % corepack pnpm dlx terser % --compress --mangle --module --output %
	find build/ -name \*.css | xargs -I % corepack pnpm dlx cssnano-cli % %
	find build/ -name \*.html | xargs -I % corepack pnpm dlx html-minifier-terser \
		--collapse-whitespace \
		--decode-entities \
		--minify-css \
		--minify-js \
		--minify-urls \
		--no-newlines-before-tag-close \
		--remove-attribute-quotes \
		--remove-comments \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-style-link-type-attributes \
		--output % %
