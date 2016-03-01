package main

const indexHTML = `
<!doctype html>
<html>
<head>
	<meta charset="UTF-8">
	<title>NATS Cast</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/3.0.3/normalize.min.css">
	<style>body{width:720px;margin:0 auto;}</style>
</head>
<body>
<h1>NATS Cast</h1>
<p id="server"></p>
<textarea id="msg-box" rows="10" cols="50"></textarea>

<script>
document.addEventListener("DOMContentLoaded", function(ev) {
	var ws = new WebSocket("ws://"+location.host+"/ws");

	ws.addEventListener("error", function(error) {
		console.log(error);
	});

	ws.addEventListener("open", function() {
		document.querySelector("#msg-box").addEventListener("input", function() {
			ws.send(this.value);
		});
	});

	ws.addEventListener("message", function(ev) {
		document.querySelector("#server").textContent = ev.data;
	});

	window.addEventListener("beforeunload", function() {
		ws.close();
	});
});
</script>
</body>
</html>
`
