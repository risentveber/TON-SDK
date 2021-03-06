const fs = require('fs');
const path = require('path');
const {
    deleteFolderRecursive,
    version,
    root_path,
    spawnProcess,
    spawnAll,
    spawnEnv,
    gz,
    devMode,
    mkdir,
} = require('../build-lib');
const exec = require('util').promisify(require('child_process').exec);

const outDir = root_path('bin');
const ndkURLStr = 'http://dl.google.com/android/repository/android-ndk-r17c-darwin-x86_64.zip';
const ndkZipFile = root_path(((parts = ndkURLStr.split('/')).length < 1 ? null : parts[parts.length - 1]));
const ndkDirName = root_path('android-ndk-r17c');

// parse arguments

let buildAndroid = false;
let buildIOS = false;
let openMode = false;
process.argv.slice(2).map(x => x.trim().toLowerCase()).forEach((arg) => {
    switch (arg) {
    case '--android':
        buildAndroid = true;
        break;
    case '--ios':
        buildIOS = true;
        break;
    case '--open':
        openMode = true;
        break;
    }
});

if (!buildAndroid && !buildIOS) {
    buildAndroid = buildIOS = true;
}

const ios = {
    archs: [
        { target: 'x86_64-apple-ios' },
        { target: 'aarch64-apple-ios' },
    ],
    lib: 'libtonclient.a',
    header: 'ton_client.h'
};
const android = {
    archs: [
        { target: 'i686-linux-android', jni: 'x86', ndk: 'x86' },
        { target: 'aarch64-linux-android', jni: 'arm64-v8a', ndk: 'arm64' },
        { target: 'armv7-linux-androideabi', jni: 'armeabi-v7a', ndk: 'arm' },
    ],
    lib: 'libtonclient.so',
};

if (devMode) {
    ios.archs.splice(1);
    android.archs.splice(1);
}

spawnEnv.PATH = [
    (spawnEnv.PATH || ''),
    ...(android.archs.map(x => root_path('NDK', x.ndk, 'bin'))),
].join(':');

async function getNDK() {
    let ndkHomeDir = process.env.NDK_HOME || '';
    if (ndkHomeDir === '' || !fs.existsSync(ndkHomeDir)) {
        try {
            if (!fs.existsSync(ndkZipFile)) {
                console.log('Downloading android NDK...');
                await spawnProcess('curl', [ndkURLStr, '-o', ndkZipFile]);
            }
            console.log('Unzipping android NDK...');
            await spawnProcess('unzip', ['-q', '-d', root_path(''), ndkZipFile]);
            ndkHomeDir = ndkDirName;
            process.env.NDK_HOME = ndkHomeDir;
        } catch (err) {
            throw err;
        }
    }
    return (ndkHomeDir);
}


async function checkNDK() {
    const ndkDir = root_path('NDK');
    const missingArchs = android.archs.map(x =>
        !fs.existsSync(path.resolve(ndkDir, x.ndk)) ? x : null
    ).filter(x => x);
    if (missingArchs.length === 0) {
        console.log('Standalone NDK already exists...');
        return;
    }
    let ndkHomeDir = await getNDK();
    if (ndkHomeDir === '' || !fs.existsSync(ndkHomeDir)) {
        ndkHomeDir = path.join(process.env.ANDROID_HOME || '', 'ndk-bundle');
    }
    const maker = path.join(ndkHomeDir, 'build', 'tools', 'make_standalone_toolchain.py');
    if (!fs.existsSync(maker)) {
        console.error('Please install android-ndk: $ brew install android-ndk');
        process.exit(1);
    }
    mkdir(ndkDir);
    process.chdir(ndkDir);
    await spawnAll(missingArchs, (arch) => {
        return ['python', maker, '--arch', arch.ndk, '--install-dir', arch.ndk];
    });
}


async function cargoBuild(targets) {
    return spawnAll(targets, x => ['cargo', 'build', '--target', x, '--release']);
}


async function buildReactNativeIosLibrary() {
    const buildRel = ['build', 'ios'];
    process.chdir(root_path(''));

    await cargoBuild(ios.archs.map(x => x.target));
    mkdir(root_path(buildRel));
    const dest = root_path(buildRel, ios.lib);
    const getIosOutput = x => path.join('target', x.target, 'release', ios.lib);
    await spawnProcess('lipo', [
        '-create',
        '-output', dest,
        ...ios.archs.map(getIosOutput),
    ]);

    if (fs.existsSync(dest)) {
        const header_src = root_path(ios.header);
        const header_dst = root_path(buildRel, ios.header);
        fs.copyFileSync(header_src, header_dst);
        await gz(
            [...buildRel, ios.lib],
            `tonclient_${version}_react_native_ios`,
            ['ios'],
        );
    }
}


async function buildReactNativeAndroidLibrary() {
    process.chdir(root_path(''));

    const buildRel = ['build', 'android'];

    await cargoBuild(android.archs.map(x => x.target));
    mkdir(root_path(buildRel));

    for (const arch of android.archs) {
        const archBuildRel = [...buildRel, arch.jni];
        mkdir(root_path(archBuildRel));
        const src = root_path('target', arch.target, 'release', android.lib);
        if (fs.existsSync(src)) {
            const dst = root_path(archBuildRel, android.lib);
            fs.copyFileSync(src, dst);
            process.stdout.write(`Android library for [${arch.target}] copied to "${dst}".\n`);
            await gz(
                [...archBuildRel, android.lib],
                `tonclient_${version}_react_native_${arch.target}`,
                ['android', 'src', 'main', 'jniLibs', arch.jni],
            );
        } else {
            process.stderr.write(`Android library for [${arch}] does not exists. Skipped.\n`);
        }
    }
}


(async () => {
    if (fs.existsSync(outDir)) {
        deleteFolderRecursive(outDir);
    }
    fs.mkdirSync(outDir);
    try {
        await checkNDK();
        let cargoTargets = ["x86_64-apple-darwin"];
        let installed = (await exec("rustup target list --installed")).stdout;
        console.log(`Installed targets:\n${installed}`);
        if (buildIOS) {
            ios.archs.map(x => x.target).forEach(val => {
                if (installed.indexOf(val) < 0) {
                    cargoTargets.push(val);
                }
            });
        }
        if (buildAndroid) {
            android.archs.map(x => x.target).forEach(val => {
                if (installed.indexOf(val) < 0) {
                    cargoTargets.push(val);
                }
            });
        }

        await spawnProcess('rustup', ['target', 'add'].concat(cargoTargets));
        if (!devMode && !openMode) {
            await spawnProcess('cargo', ['update']);
        }
        if (buildIOS) {
            await buildReactNativeIosLibrary();
        }
        if (buildAndroid) {
            await buildReactNativeAndroidLibrary();
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
