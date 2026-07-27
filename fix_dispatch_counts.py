#!/usr/bin/env python3
"""
Simple script to identify dispatched orders that need status updates.
This will generate the API calls needed to fix the dispatch counts.
"""

import json
from datetime import datetime

# Based on the screenshot, we need to find:
# - Halima 02: 1 dispatched order  
# - Omaima 01: 10 dispatched orders

def generate_api_commands():
    """
    Generate curl commands to check and update dispatched orders.
    """
    
    print("# Check dispatched orders for each agent")
    print("# =====================================")
    print()
    
    # First, let's get the agent IDs and check their dispatched orders
    agents = [
        {"name": "Halima 02", "id": "halima.02"},  # Need to get actual ID
        {"name": "Omaima 01", "id": "omaima.01"}   # Need to get actual ID  
    ]
    
    base_url = "https://api.tawazonhealth.store/v1"
    admin_key = "YOUR_ADMIN_API_KEY"  # Replace with actual key
    
    print("# 1. First, get agent list to find IDs:")
    print(f'curl -H "X-Admin-Key: {admin_key}" {base_url}/admin/agents')
    print()
    
    print("# 2. Get orders for each agent (replace AGENT_ID with actual ID):")
    for agent in agents:
        print(f"# For {agent['name']}:")
        print(f'curl -H "X-Admin-Key: {admin_key}" "{base_url}/admin/orders?agent_id=AGENT_ID&status=dispatched" | jq')
        print()
    
    print("# 3. Update orders from dispatched to shipped:")
    print("# (Run this for each order ID found above)")
    print(f'curl -X PATCH -H "X-Admin-Key: {admin_key}" -H "Content-Type: application/json" \\')
    print(f'  -d \'{{"status": "shipped"}}\' \\')
    print(f'  {base_url}/admin/orders/ORDER_ID/status')
    print()
    
    print("# Alternative: Use SQL if you have database access:")
    print("# UPDATE orders SET status = 'shipped' WHERE dispatched_at IS NOT NULL AND delivery_tracking IS NOT NULL;")


def generate_sql_solution():
    """
    Generate SQL commands to directly fix the issue.
    """
    
    print("# SQL Solution to reset dispatch counts")
    print("# =====================================")
    print()
    
    sql_commands = [
        "-- Check current dispatched orders by agent",
        """
SELECT 
    a.name as agent_name,
    COUNT(o.id) as dispatched_count,
    STRING_AGG(o.public_order_number, ', ') as orders
FROM orders o
JOIN agents a ON o.assigned_agent_id = a.id  
WHERE o.dispatched_at IS NOT NULL 
  AND o.delivery_tracking IS NOT NULL
  AND (a.name ILIKE '%halima%' OR a.name ILIKE '%omaima%')
GROUP BY a.id, a.name;
""",
        "",
        "-- Option 1: Mark all dispatched orders as shipped (recommended)",
        """
UPDATE orders 
SET status = 'shipped'
WHERE dispatched_at IS NOT NULL 
  AND delivery_tracking IS NOT NULL
  AND status = 'dispatched';
""",
        "",
        "-- Option 2: Clear dispatch info (moves back to confirmed)",  
        """
UPDATE orders 
SET dispatched_at = NULL,
    delivery_tracking = NULL
WHERE dispatched_at IS NOT NULL 
  AND delivery_tracking IS NOT NULL
  AND status = 'dispatched';
""",
        "",
        "-- Verify the fix",
        """
SELECT 
    a.name as agent_name,
    COUNT(CASE WHEN o.dispatched_at IS NOT NULL AND o.delivery_tracking IS NOT NULL THEN 1 END) as dispatched_count
FROM orders o
JOIN agents a ON o.assigned_agent_id = a.id  
WHERE a.name ILIKE '%halima%' OR a.name ILIKE '%omaima%'
GROUP BY a.id, a.name;
"""
    ]
    
    for cmd in sql_commands:
        print(cmd)


if __name__ == "__main__":
    print("Reset Dispatch Counts - Solution Guide")
    print("=" * 50)
    print()
    
    print("The issue: Orders are stuck in 'dispatched' status, showing in 'للإرسال' counts.")
    print("Solution: Update these orders to 'shipped' status to clear the counts.")
    print()
    
    generate_sql_solution()
    print()
    generate_api_commands()