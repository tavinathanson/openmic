import pandas as pd
import random
import sys
from typing import List

def calculate_tickets(row: pd.Series) -> int:
    """Calculate number of tickets for a comedian based on their status."""
    tickets = 1  # Base ticket
    
    # Check for "first 5" bonus
    if str(row['first 5']).upper() == 'X':
        tickets += 1
    
    # Check for "early" bonus
    if str(row['early']).upper() == 'X':
        tickets += 1
    
    return tickets

def select_random_comedians(csv_path: str, num_winners: int = 4) -> List[str]:
    """
    Select random comedians with weighted tickets.
    
    Args:
        csv_path: Path to the CSV file
        num_winners: Number of winners to select (default: 4)
    
    Returns:
        List of selected comedian names
    """
    # Read the CSV file
    df = pd.read_csv(csv_path)
    
    # Convert 'done' column to string type
    df['done'] = df['done'].astype(str)
    
    # Filter for comedians who haven't been marked as done, and who are marked as "here"
    comedians = df[
        (df['signup_type'] == 'comedian') & 
        (~df['done'].str.upper().isin(['X', 'x'])) &
        (df['here'].str.upper().isin(['X', 'x']))
    ]
    
    if len(comedians) == 0:
        raise ValueError("No eligible comedians found in the CSV file")
    
    # Print ticket counts for each person
    print("\nTicket counts for eligible comedians:")
    print("-" * 40)
    for _, row in comedians.iterrows():
        tickets = calculate_tickets(row)
        print(f"{row['full_name']}: {tickets} ticket(s)")
    print("-" * 40)
    
    # Create a weighted pool of names
    weighted_pool = []
    for _, row in comedians.iterrows():
        tickets = calculate_tickets(row)
        weighted_pool.extend([row['full_name']] * tickets)
    
    # Check if we have enough unique people to select from
    unique_people = set(weighted_pool)
    if len(unique_people) < num_winners:
        raise ValueError(f"Not enough unique eligible comedians to select {num_winners} winners")
    
    # Randomly select winners without replacement
    winners = []
    remaining_pool = weighted_pool.copy()
    
    for _ in range(num_winners):
        if not remaining_pool:
            raise ValueError("Not enough unique people to select from")
        
        # Select a winner
        winner = random.choice(remaining_pool)
        winners.append(winner)
        
        # Remove all instances of this winner from the pool
        remaining_pool = [name for name in remaining_pool if name != winner]
    
    return winners

def main():
    if len(sys.argv) != 2:
        print("Usage: python random_comedian_selector.py <csv_file_path>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    try:
        winners = select_random_comedians(csv_path)
        print("\nSelected comedians:")
        for i, winner in enumerate(winners, 1):
            print(f"{i}. {winner}")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 