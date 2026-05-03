pipeline {
    agent any

    environment {
        // You can define environment variables here if needed
        COMPOSE_PROJECT_NAME = "snapshot-jenkins"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Clean Up Previous Runs') {
            steps {
                script {
                    // Stop and remove existing containers
                    sh 'docker compose -p ${COMPOSE_PROJECT_NAME} down --remove-orphans || true'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    sh 'docker compose -p ${COMPOSE_PROJECT_NAME} build'
                }
            }
        }

        stage('Deploy Containers') {
            steps {
                script {
                    // Start containers in detached mode
                    sh 'docker compose -p ${COMPOSE_PROJECT_NAME} up -d'
                }
            }
        }

        stage('Verify Running Containers') {
            steps {
                script {
                    sh 'docker compose -p ${COMPOSE_PROJECT_NAME} ps'
                }
            }
        }
    }

    post {
        always {
            echo 'Deployment Pipeline Finished!'
        }
        failure {
            echo 'Pipeline failed. Check the logs.'
        }
    }
}
