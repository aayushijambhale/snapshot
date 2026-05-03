pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "snapshot_ci_${env.BUILD_ID}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Preparing environment...'
                bat 'copy .env.example .env'
            }
        }

        stage('Cleanup Old Containers') {
            steps {
                echo 'Cleaning old containers...'
                bat 'docker-compose down --remove-orphans'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker images...'
                bat 'docker-compose build'
            }
        }

        stage('Run Containers') {
            steps {
                echo 'Starting containers...'
                bat 'docker-compose up -d'
            }
        }

        stage('Test & Verify') {
            steps {
                echo 'Verifying containers...'

                // wait for services
                sleep time: 15, unit: 'SECONDS'

                // check running containers
                bat 'docker ps'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up docker containers...'
            bat 'docker-compose down --remove-orphans'
            cleanWs()
        }

        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
