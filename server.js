var http = require('http');
var fs = require('fs');
var config = require('./config/config').config;
var mimes = require('./config/mimes').mimes;
var redirect = require('./config/redirect').redirect;

var server = http.createServer(function (req, res) {
	var uri = req.url.split('?')[0].replace(/^\/(.+?)$/, '$1');
	var file = [config.docpath, uri.split('#')[0]].join('/').replace(/\/{2,}/g, '/');
	var has_ext = uri.split('#')[0].split('.').length > 1;
	
	var file_ext = uri.split('#')[0].split('.')[uri.split('#')[0].split('.').length-1];
	var query = ((req.url || '').split('?')[1] || '').split('&');
	var mime = mimes[file_ext];
	var redir_info = (has_ext ? redirect.extensions[file_ext] : redirect.extensions[redirect.default_extension]) || false;

	if (!redir_info) {
		fs.lstat(file, function (err, stat) {
			if (!err) {
				var docPath = stat.isDirectory() ? file+'/'+config.index : file;
				docPath = docPath.replace(/\/{2,}/g, '/');
				
				fs.readFile(docPath, function (err, content) {
					if (!err) {
						res.writeHead(200, {
							'Server':'Yet Another Node.js Server',
							'Content-Type':mime
						});
						res.end(content, 'utf-8');
					} else {
						respError(err, res);
					}
				});
			} else {
				respError(err, res);
			}
		});
	} else {
		var proxy = http.createClient(redir_info.port, redir_info.ip);
		var proxy_req = proxy.request(req.method, req.url, req.headers);
		proxy_req.end();
		
		proxy_req.on('response', function (proxy_res) {
			proxy_res.on('data', function (chunk) {
				res.writeHead(proxy_res.statusCode, proxy_res.headers);
				res.write(chunk);
				res.end();
			});
		});
	}
}).listen(config.port, config.host);

var respError = function (err, res) {
	switch (err.code) {
			case 'ENOENT':
				res.writeHead(404);
				res.write('<h1>ERROR 404 - File not found!</h1>');
			break;
			default:
				res.writeHead(500);
				res.write('<h1>ERROR 500 - Internal server error!</h1>');
		}
		
		res.end('<pre>'+(err.toString())+'</pre>');
};

console.log('Yet Another Node.js Server 0.01');
console.log('Listening at '+config.host+':'+config.port+'...\n');
console.log('Redirections:');

for (i in redirect.extensions) {
	var ri = redirect.extensions[i];
	console.log('\t*.'+i+' to '+ri.ip+':'+ri.port);
}