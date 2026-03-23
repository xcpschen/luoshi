

clean:
	rm -rfv ./dist-release ./dist ./dist-electron;

build_and_install: clean
	npm run build;
# 	rm -rfv /Applications/LinkAndroid.app;
# 	cp -a ./dist-release/mac-arm64/LinkAndroid.app /Applications

build_x64: clean
	export ARCH=x64 && npm run build:mac;


build_win_x64: clean
	export ARCH=x64 && export PLATFORM=win && npm run rebuild:sqlite && npm run build:win;
		