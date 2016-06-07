test: 
	@NODE_ENV=test mocha \
	           --harmony \
	           --reporter spec \
	           --bail
.PHONY: test