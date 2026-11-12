package customer

import "testing"

func TestRewardPointsForAmount(t *testing.T) {
	tests := []struct {
		name   string
		amount float64
		want   int
	}{
		{name: "không chi tiêu", amount: 0, want: 0},
		{name: "số âm", amount: -10000, want: 0},
		{name: "dưới mốc", amount: 9999, want: 0},
		{name: "đúng mốc", amount: 10000, want: 1},
		{name: "làm tròn xuống", amount: 25999, want: 2},
		{name: "nhiều mốc", amount: 250000, want: 25},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RewardPointsForAmount(tt.amount); got != tt.want {
				t.Fatalf("RewardPointsForAmount(%v) = %d, muốn %d", tt.amount, got, tt.want)
			}
		})
	}
}
