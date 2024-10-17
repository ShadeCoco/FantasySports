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

;; Data Maps
(define-map teams
    principal
    (list 10 uint))  ;; List of player IDs

(define-map player-scores
    uint  ;; player ID
    uint) ;; current score

(define-map user-points
    principal
    uint)

(define-map user-entry-paid
    principal
    bool)

;; Administrative Functions
(define-public (set-season-status (new-status bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (var-set season-status new-status)
        (ok true)))

(define-public (set-entry-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (var-set entry-fee new-fee)
        (ok true)))

;; Team Management Functions
(define-public (join-league)
    (let ((current-balance (stx-get-balance tx-sender)))
        (asserts! (var-get season-status) ERR-SEASON-ENDED)
        (asserts! (>= current-balance (var-get entry-fee)) ERR-INSUFFICIENT-BALANCE)
        (asserts! (not (default-to false (map-get? user-entry-paid tx-sender))) ERR-TEAM-FULL)
        (begin
            (try! (stx-transfer? (var-get entry-fee) tx-sender (as-contract tx-sender)))
            (var-set total-prize-pool (+ (var-get total-prize-pool) (var-get entry-fee)))
            (map-set user-entry-paid tx-sender true)
            (ok true))))

(define-public (draft-player (player-id uint))
    (let ((current-team (default-to (list) (map-get? teams tx-sender))))
        (asserts! (var-get season-status) ERR-SEASON-ENDED)
        (asserts! (default-to false (map-get? user-entry-paid tx-sender)) ERR-NOT-AUTHORIZED)
        (asserts! (< (len current-team) u10) ERR-TEAM-FULL)
        (begin
            (map-set teams tx-sender (append current-team player-id))
            (ok true))))

;; Scoring and Oracle Functions
(define-public (update-player-score (player-id uint) (new-score uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (map-set player-scores player-id new-score)
        (ok true)))

(define-public (calculate-team-points (user principal))
    (let ((team (default-to (list) (map-get? teams user)))
          (total-points (fold + (map get-player-score team) u0)))
        (begin
            (map-set user-points user total-points)
            (ok total-points))))

(define-read-only (get-player-score (player-id uint))
    (default-to u0 (map-get? player-scores player-id)))

;; Reward Distribution
(define-public (distribute-rewards)
    (let ((winner (get-highest-scorer)))
        (begin
            (asserts! (not (var-get season-status)) ERR-SEASON-NOT-ENDED)
            (try! (as-contract (stx-transfer? (var-get total-prize-pool) tx-sender winner)))
            (var-set total-prize-pool u0)
            (ok true))))

(define-read-only (get-highest-scorer)
    (let ((participants (map-keys user-points)))
        (fold get-higher-scorer participants (element-at participants u0))))

(define-private (get-higher-scorer (a principal) (b principal))
    (if (> (default-to u0 (map-get? user-points a))
           (default-to u0 (map-get? user-points b)))
        a
        b))

;; Getters
(define-read-only (get-team (user principal))
    (default-to (list) (map-get? teams user)))

(define-read-only (get-user-points (user principal))
    (default-to u0 (map-get? user-points user)))

(define-read-only (get-prize-pool)
    (var-get total-prize-pool))
