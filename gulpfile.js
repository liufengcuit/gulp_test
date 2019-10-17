const gulp = require("gulp");
const ssh = require("gulp-ssh");
const scp = require('gulp-scp2');
const minimist = require('minimist');
const gulpSequence = require('gulp-sequence');
const zip = require('gulp-zip');


var exec = require('child_process').exec

const remotePathDev = "/test";  //dev zip资源路径
const fileName = "test"; // 需要发布的文件名
const fullName = `${fileName}${new Date().getTime()}.zip`; // zip文件全称

const sshConfig = {
    dev: {
        host: '127.0.0.1',
        username: 'root',
        password: '123456',
        dest: remotePathDev,
        port: '22'
    }
}

const knownOptions = [
    {
        string: 'env',
        default: {env: 'dev'}
    }
];
const options = minimist(process.argv.slice(2), knownOptions);

let service = null;

gulp.task('deploy', () => {
    service = sshConfig[options.env];
    if (service) {
        gulpSequence('zip', 'resources', 'shell', function (e) {
            console.log(e)
        });
    } else {
        console.error('发布失败！！！，未指定资源服务器')
    }
})

gulp.task('zip', (res) => {
    let zipStream = gulp.src('html/**/*')
        .pipe(zip(`${fullName}`))
        .pipe(gulp.dest('html_zip'))
        .on('error', (err) => {
            console.log('资源压缩ZIP失败', err)
        })
    return zipStream
})


gulp.task('resources', () => {
    service.destination = service.dest;
    service.dest = `${service.dest}/test`;
    let upStream = gulp.src(`html_zip/${fullName}`)
        .pipe(scp({
            ...service,
            watch: function(client) {
                client.on('write', function(o) {
                    console.log('write %s', o.destination);
                });
            }
        }))
        .on('error', (err) => {
            console.log('资源上传失败', err);
        });
    return upStream
})

gulp.task('shell', () => {
    const gulpSSH = new ssh({
        ignoreErrors: false,
        sshConfig: service
    })
    const commands = [`cd ${service.destination}/${fileName} && cd ${service.dest} && unzip -o -d ${service.destination}/${fileName} ${fullName} && chmod 755 -R ${service.destination}/${fileName}/* && rm -rf ./${fullName}`];
    return gulpSSH.shell(commands);
})
