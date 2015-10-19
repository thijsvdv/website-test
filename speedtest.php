<?php
header("Content-type: text/plain");
header("Access-Control-Allow-Origin: *");
// Working version:
if(isset($_GET['url']) && $_GET['url'] !== '') {
  // $output = shell_exec('../phantomjs/bin/phantomjs ./speedtest.js "' . $_GET['url'] . '"');
  $output = shell_exec('phantomjs ./speedtest.js "' . $_GET['url'] . '"');
  print $output;
} else {
  print "Please provide a URL";
}
