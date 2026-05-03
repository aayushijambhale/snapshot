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

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker images using docker-compose...'
                // Using bat for Windows Jenkins node
                bat 'docker-compose build'
            }
        }

        stage('Test & Verify') {
            steps {
                echo 'Starting up containers to verify they can run...'
                bat 'docker-compose up -d'
                
                // Wait for the containers to fully start
                sleep time: 15, unit: 'SECONDS'
                
                // Check running containers
                bat 'docker ps'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up docker containers...'
            bat 'docker-compose down'
            
            // Clean the workspace to prevent permission issues on next run
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
