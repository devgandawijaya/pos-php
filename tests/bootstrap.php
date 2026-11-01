<?php

$_SERVER['DB_DATABASE'] = 'pos_saas_testing';
$_ENV['DB_DATABASE'] = 'pos_saas_testing';
putenv('DB_DATABASE=pos_saas_testing');

require __DIR__.'/../vendor/autoload.php';
