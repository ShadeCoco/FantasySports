;; Fantasy Sports League Contract
;; Implements team management, scoring, and reward distribution

(define-constant ERR-NOT-AUTHORIZED (err u1))
(define-constant ERR-SEASON-ENDED (err u2))
(define-constant ERR-INVALID-PLAYER (err u3))
(define-constant ERR-INSUFFICIENT-BALANCE (err u4))
(define-constant ERR-TEAM-FULL (err u5))
(define-constant ERR-SEASON-NOT-ENDED (err u6))

;; Data Variables
(define-data-var season-status bool true)
(define-data-var entry-fee uint u100000000) ;; 100 STX
(define-data-var total-prize-pool uint u0)

