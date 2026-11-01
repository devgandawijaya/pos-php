<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Creates the application and ensures test database isolation.
     *
     * @return Application
     */
    public function createApplication()
    {
        $_SERVER['DB_DATABASE'] = 'pos_saas_testing';
        $_ENV['DB_DATABASE'] = 'pos_saas_testing';
        putenv('DB_DATABASE=pos_saas_testing');

        $app = parent::createApplication();

        // Enforce dedicated test database so live development database is never modified or wiped
        $app['config']->set('database.connections.pgsql.database', 'pos_saas_testing');

        return $app;
    }
}
