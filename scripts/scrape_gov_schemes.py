#!/usr/bin/env python3
"""
Government Financial Schemes Scraper
------------------------------------
Scrapes financial schemes from the National Portal of India (india.gov.in)
for use in the Finstability financial recommendation engine.

Author: Finstability Team
Date: March 2026
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import time
import re
import os
from typing import List, Dict, Optional
from urllib.parse import urljoin

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_URL = "https://www.india.gov.in"
SCHEMES_URL = f"{BASE_URL}/my-government/schemes"

# Headers to mimic a real browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# Delay between requests (in seconds) - polite scraping
REQUEST_DELAY = 1.5

# Output directory
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def clean_text(text: Optional[str]) -> str:
    """
    Clean and normalize extracted text.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text with normalized whitespace
    """
    if not text:
        return ""
    
    # Remove extra whitespace and newlines
    cleaned = re.sub(r'\s+', ' ', text)
    # Remove leading/trailing whitespace
    cleaned = cleaned.strip()
    # Remove any non-printable characters
    cleaned = ''.join(char for char in cleaned if char.isprintable() or char == ' ')
    
    return cleaned


def extract_text_safely(element, selector: str = None) -> str:
    """
    Safely extract text from a BeautifulSoup element.
    
    Args:
        element: BeautifulSoup element or None
        selector: Optional CSS selector to find within element
        
    Returns:
        Cleaned text or empty string
    """
    try:
        if selector:
            found = element.select_one(selector)
            return clean_text(found.get_text()) if found else ""
        return clean_text(element.get_text()) if element else ""
    except (AttributeError, TypeError):
        return ""


def categorize_scheme(name: str, description: str) -> str:
    """
    Categorize a scheme based on its name and description.
    
    Args:
        name: Scheme name
        description: Scheme description
        
    Returns:
        Category string
    """
    text = (name + " " + description).lower()
    
    # Define category keywords
    categories = {
        "education": ["education", "scholarship", "student", "school", "college", "university", "learning"],
        "agriculture": ["agriculture", "farmer", "crop", "irrigation", "kisan", "krishi", "farming"],
        "healthcare": ["health", "medical", "hospital", "ayushman", "insurance", "treatment", "medicine"],
        "housing": ["housing", "awas", "home", "shelter", "pradhan mantri awas"],
        "employment": ["employment", "skill", "job", "rozgar", "training", "livelihood"],
        "women_welfare": ["women", "mahila", "girl", "beti", "maternity", "widow"],
        "senior_citizen": ["senior", "pension", "elderly", "old age", "vridha"],
        "msme_business": ["msme", "business", "entrepreneur", "mudra", "startup", "enterprise", "loan"],
        "social_welfare": ["welfare", "backward", "sc", "st", "minority", "disabled", "divyang"],
        "finance_subsidy": ["subsidy", "finance", "credit", "loan", "lpg", "gas", "electricity"],
        "rural_development": ["rural", "gram", "village", "panchayat", "gramin"],
        "digital_india": ["digital", "internet", "broadband", "technology", "cyber"],
    }
    
    for category, keywords in categories.items():
        if any(keyword in text for keyword in keywords):
            return category
    
    return "general"


def make_request(url: str, retries: int = 3) -> Optional[requests.Response]:
    """
    Make an HTTP request with retry logic.
    
    Args:
        url: URL to request
        retries: Number of retry attempts
        
    Returns:
        Response object or None if failed
    """
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            print(f"  ⚠ Request failed (attempt {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(2)  # Wait before retry
    return None


# =============================================================================
# SCRAPING FUNCTIONS
# =============================================================================

def get_scheme_links() -> List[str]:
    """
    Get all scheme URLs from the schemes listing pages.
    Handles pagination automatically.
    
    Returns:
        List of scheme detail page URLs
    """
    scheme_links = []
    page = 0
    
    print("\n" + "="*60)
    print("COLLECTING SCHEME LINKS")
    print("="*60)
    
    while True:
        # Construct paginated URL
        if page == 0:
            url = SCHEMES_URL
        else:
            url = f"{SCHEMES_URL}?page={page}"
        
        print(f"\nFetching page {page + 1}: {url}")
        
        response = make_request(url)
        if not response:
            print(f"  ✗ Failed to fetch page {page + 1}")
            break
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find scheme links - adjust selectors based on actual page structure
        # Common patterns for government websites
        links_found = []
        
        # Try different selectors that might match the scheme listings
        selectors = [
            'div.view-content a[href*="/schemes/"]',
            'div.views-row a[href*="/schemes/"]',
            'article a[href*="/schemes/"]',
            'li.views-row a',
            'div.scheme-item a',
            'table.views-table a[href*="/schemes/"]',
            'a[href*="/my-government/schemes/"]',
        ]
        
        for selector in selectors:
            found = soup.select(selector)
            if found:
                links_found.extend(found)
        
        # Also try finding links in main content area
        main_content = soup.find('div', class_=['view-content', 'main-content', 'content'])
        if main_content:
            for link in main_content.find_all('a', href=True):
                if '/schemes/' in link['href'] or 'scheme' in link['href'].lower():
                    links_found.append(link)
        
        if not links_found:
            print(f"  No more schemes found on page {page + 1}")
            break
        
        # Extract unique URLs
        page_links = set()
        for link in links_found:
            href = link.get('href', '')
            if href:
                # Convert relative URLs to absolute
                full_url = urljoin(BASE_URL, href)
                # Filter out non-scheme pages
                if '/schemes/' in full_url or 'scheme' in full_url.lower():
                    page_links.add(full_url)
        
        new_links = [l for l in page_links if l not in scheme_links]
        
        if not new_links:
            print(f"  No new unique links found on page {page + 1}")
            break
        
        scheme_links.extend(new_links)
        print(f"  ✓ Found {len(new_links)} schemes (Total: {len(scheme_links)})")
        
        # Check for next page
        next_page = soup.select_one('a[rel="next"], li.pager-next a, a.next')
        if not next_page:
            print("\n  No more pages found")
            break
        
        page += 1
        time.sleep(REQUEST_DELAY)  # Polite delay
    
    print(f"\n✓ Total unique scheme links collected: {len(scheme_links)}")
    return list(set(scheme_links))


def scrape_scheme_page(url: str) -> Optional[Dict]:
    """
    Scrape detailed information from a single scheme page.
    
    Args:
        url: URL of the scheme detail page
        
    Returns:
        Dictionary with scheme details or None if failed
    """
    response = make_request(url)
    if not response:
        return None
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Initialize scheme data
    scheme = {
        "scheme_name": "",
        "ministry": "",
        "description": "",
        "eligibility": "",
        "target_beneficiaries": "",
        "benefits": "",
        "application_process": "",
        "application_link": "",
        "state": "",
        "category": "",
        "source_url": url
    }
    
    # ==========================================================================
    # EXTRACT SCHEME NAME
    # ==========================================================================
    # Try multiple selectors for the title
    title_selectors = [
        'h1.page-title',
        'h1#page-title',
        'h1.title',
        'article h1',
        'div.content h1',
        'h1',
    ]
    
    for selector in title_selectors:
        title = soup.select_one(selector)
        if title:
            scheme["scheme_name"] = clean_text(title.get_text())
            break
    
    # ==========================================================================
    # EXTRACT CONTENT SECTIONS
    # ==========================================================================
    # Get main content area
    content_area = soup.find('article') or soup.find('div', class_='content') or soup.find('main')
    
    if content_area:
        # Extract all text paragraphs for description
        paragraphs = content_area.find_all('p')
        description_parts = []
        for p in paragraphs[:5]:  # Limit to first 5 paragraphs
            text = clean_text(p.get_text())
            if text and len(text) > 20:
                description_parts.append(text)
        scheme["description"] = " ".join(description_parts)
        
        # Look for labeled sections
        section_mappings = {
            "eligibility": ["eligibility", "eligible", "who can apply", "criteria"],
            "benefits": ["benefits", "advantages", "features", "salient features"],
            "target_beneficiaries": ["beneficiaries", "target group", "target audience", "for whom"],
            "application_process": ["process", "how to apply", "application", "procedure", "steps"],
            "ministry": ["ministry", "department", "nodal agency", "implementing agency"],
        }
        
        # Find all headings and their content
        for heading in content_area.find_all(['h2', 'h3', 'h4', 'strong', 'b']):
            heading_text = clean_text(heading.get_text()).lower()
            
            # Find content following this heading
            content_parts = []
            sibling = heading.find_next_sibling()
            while sibling and sibling.name not in ['h2', 'h3', 'h4']:
                if sibling.name in ['p', 'ul', 'ol', 'div']:
                    content_parts.append(clean_text(sibling.get_text()))
                sibling = sibling.find_next_sibling()
            
            content = " ".join(content_parts)
            
            # Match heading to field
            for field, keywords in section_mappings.items():
                if any(kw in heading_text for kw in keywords):
                    if content and not scheme[field]:
                        scheme[field] = content
                    break
        
        # Extract any application links
        for link in content_area.find_all('a', href=True):
            href = link['href']
            link_text = clean_text(link.get_text()).lower()
            if any(kw in link_text for kw in ['apply', 'application', 'register', 'portal']):
                scheme["application_link"] = urljoin(BASE_URL, href)
                break
    
    # ==========================================================================
    # EXTRACT FROM TABLES (common in gov websites)
    # ==========================================================================
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                label = clean_text(cells[0].get_text()).lower()
                value = clean_text(cells[1].get_text())
                
                if 'ministry' in label or 'department' in label:
                    scheme["ministry"] = value
                elif 'state' in label:
                    scheme["state"] = value
                elif 'eligibility' in label:
                    scheme["eligibility"] = value
                elif 'benefit' in label:
                    scheme["benefits"] = value
    
    # ==========================================================================
    # CATEGORIZE SCHEME
    # ==========================================================================
    scheme["category"] = categorize_scheme(
        scheme["scheme_name"], 
        scheme["description"]
    )
    
    # ==========================================================================
    # DETECT STATE (if mentioned)
    # ==========================================================================
    if not scheme["state"]:
        # Common Indian states
        states = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
            "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
            "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
            "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"
        ]
        
        full_text = scheme["scheme_name"] + " " + scheme["description"]
        for state in states:
            if state.lower() in full_text.lower():
                scheme["state"] = state
                break
        
        if not scheme["state"]:
            scheme["state"] = "Central"  # Default to Central Government scheme
    
    return scheme


def scrape_additional_sources() -> List[Dict]:
    """
    Scrape additional financial scheme sources.
    These are curated common schemes that may not be on the main listing.
    
    Returns:
        List of scheme dictionaries
    """
    # Known important financial schemes with their details
    known_schemes = [
        {
            "scheme_name": "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
            "ministry": "Ministry of Finance",
            "description": "National Mission for Financial Inclusion to ensure access to financial services like Banking/Savings & Deposit Accounts, Remittance, Credit, Insurance, Pension in an affordable manner.",
            "eligibility": "Any Indian citizen above 10 years of age who does not have a bank account",
            "target_beneficiaries": "Unbanked population, rural and urban poor",
            "benefits": "Zero balance bank account, RuPay debit card, accidental insurance cover of Rs 2 lakh, overdraft facility up to Rs 10,000",
            "application_process": "Visit nearest bank branch with Aadhaar card or any other identity proof",
            "application_link": "https://pmjdy.gov.in/",
            "state": "Central",
            "category": "finance_subsidy"
        },
        {
            "scheme_name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "description": "Income support scheme for farmer families having cultivable land. Provides Rs 6000 per year in three equal installments.",
            "eligibility": "Small and marginal farmer families with cultivable landholding",
            "target_beneficiaries": "Farmers",
            "benefits": "Rs 6000 per year transferred directly to bank account in three installments",
            "application_process": "Register through local revenue officer, Common Service Centre, or PM-KISAN portal",
            "application_link": "https://pmkisan.gov.in/",
            "state": "Central",
            "category": "agriculture"
        },
        {
            "scheme_name": "Pradhan Mantri Mudra Yojana (PMMY)",
            "ministry": "Ministry of Finance",
            "description": "Provides loans up to Rs 10 lakh to non-corporate, non-farm small/micro enterprises. Three products: Shishu (up to 50,000), Kishore (50,000-5 lakh), Tarun (5-10 lakh).",
            "eligibility": "Any Indian citizen with a business plan for non-farm income generating activity",
            "target_beneficiaries": "Small business owners, entrepreneurs, MSMEs",
            "benefits": "Collateral-free loans up to Rs 10 lakh for business purposes",
            "application_process": "Apply at any bank, MFI, or NBFC with business plan",
            "application_link": "https://www.mudra.org.in/",
            "state": "Central",
            "category": "msme_business"
        },
        {
            "scheme_name": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
            "ministry": "Ministry of Health and Family Welfare",
            "description": "World's largest health insurance scheme providing Rs 5 lakh coverage per family per year for secondary and tertiary care hospitalization.",
            "eligibility": "Families identified based on SECC database, no income ceiling for economically deprived",
            "target_beneficiaries": "Poor and vulnerable families",
            "benefits": "Rs 5 lakh health coverage per family, cashless treatment at empaneled hospitals",
            "application_process": "Check eligibility on mera.pmjay.gov.in, visit nearest CSC or empaneled hospital",
            "application_link": "https://pmjay.gov.in/",
            "state": "Central",
            "category": "healthcare"
        },
        {
            "scheme_name": "Pradhan Mantri Awas Yojana (PMAY)",
            "ministry": "Ministry of Housing and Urban Affairs",
            "description": "Housing for All mission providing assistance for construction or enhancement of houses to all eligible families.",
            "eligibility": "EWS/LIG/MIG households who do not own a pucca house, annual income criteria apply",
            "target_beneficiaries": "Houseless and those living in kutcha houses",
            "benefits": "Subsidy ranging from Rs 1.5 lakh to Rs 2.67 lakh on home loan interest",
            "application_process": "Apply through PMAY portal or visit nearest CSC/bank",
            "application_link": "https://pmaymis.gov.in/",
            "state": "Central",
            "category": "housing"
        },
        {
            "scheme_name": "Sukanya Samriddhi Yojana",
            "ministry": "Ministry of Finance",
            "description": "Small savings scheme for girl child with attractive interest rate and tax benefits under Beti Bachao Beti Padhao campaign.",
            "eligibility": "Girl child below 10 years of age, one account per girl, max 2 accounts per family",
            "target_beneficiaries": "Girl children and their parents/guardians",
            "benefits": "High interest rate (currently 8.2%), tax exemption under 80C, maturity at 21 years",
            "application_process": "Open account at any post office or authorized bank with birth certificate",
            "application_link": "https://www.india.gov.in/sukanya-samriddhi-yojna",
            "state": "Central",
            "category": "women_welfare"
        },
        {
            "scheme_name": "Atal Pension Yojana (APY)",
            "ministry": "Ministry of Finance (PFRDA)",
            "description": "Guaranteed pension scheme for workers in unorganized sector providing fixed pension of Rs 1000-5000 per month after 60 years.",
            "eligibility": "Indian citizen aged 18-40 years with bank account",
            "target_beneficiaries": "Workers in unorganized sector",
            "benefits": "Guaranteed pension Rs 1000-5000/month, government co-contribution for eligible subscribers",
            "application_process": "Enroll through bank or post office with Aadhaar",
            "application_link": "https://www.npscra.nsdl.co.in/",
            "state": "Central",
            "category": "senior_citizen"
        },
        {
            "scheme_name": "Stand Up India",
            "ministry": "Ministry of Finance",
            "description": "Facilitates bank loans between Rs 10 lakh and Rs 1 crore to SC/ST and women entrepreneurs for greenfield enterprises.",
            "eligibility": "SC/ST and/or Women entrepreneurs, above 18 years, for greenfield project",
            "target_beneficiaries": "SC/ST entrepreneurs, Women entrepreneurs",
            "benefits": "Loans from Rs 10 lakh to Rs 1 crore for manufacturing, services or trading sector",
            "application_process": "Apply through standupmitra.in portal or visit any scheduled commercial bank",
            "application_link": "https://www.standupmitra.in/",
            "state": "Central",
            "category": "msme_business"
        },
        {
            "scheme_name": "PM SVANidhi (Street Vendor's AtmaNirbhar Nidhi)",
            "ministry": "Ministry of Housing and Urban Affairs",
            "description": "Micro credit facility for street vendors to resume their livelihood post COVID-19 lockdown.",
            "eligibility": "Street vendors operating on or before March 24, 2020",
            "target_beneficiaries": "Street vendors",
            "benefits": "Working capital loan up to Rs 10,000 (1st), Rs 20,000 (2nd), Rs 50,000 (3rd cycle)",
            "application_process": "Apply through pmsvanidhi.mohua.gov.in with vendor certificate",
            "application_link": "https://pmsvanidhi.mohua.gov.in/",
            "state": "Central",
            "category": "msme_business"
        },
        {
            "scheme_name": "National Education Policy Scholarship",
            "ministry": "Ministry of Education",
            "description": "Various scholarship schemes for students at different levels of education based on merit and means.",
            "eligibility": "Students from economically weaker sections with good academic record",
            "target_beneficiaries": "Students at school, college, and higher education levels",
            "benefits": "Financial assistance for tuition fees, maintenance allowance",
            "application_process": "Apply through National Scholarship Portal",
            "application_link": "https://scholarships.gov.in/",
            "state": "Central",
            "category": "education"
        },
        {
            "scheme_name": "Pradhan Mantri Ujjwala Yojana",
            "ministry": "Ministry of Petroleum and Natural Gas",
            "description": "Provides free LPG connections to women of BPL households to ensure clean cooking fuel.",
            "eligibility": "Adult woman from BPL household, no existing LPG connection",
            "target_beneficiaries": "BPL families, especially women",
            "benefits": "Free LPG connection, first refill and stove free",
            "application_process": "Apply at nearest LPG distributor with Aadhaar and BPL card",
            "application_link": "https://www.pmujjwalayojana.com/",
            "state": "Central",
            "category": "finance_subsidy"
        },
        {
            "scheme_name": "PMEGP (Prime Minister's Employment Generation Programme)",
            "ministry": "Ministry of MSME",
            "description": "Credit linked subsidy scheme to generate employment opportunities through establishment of micro enterprises.",
            "eligibility": "Individual above 18 years, 8th pass for projects above Rs 10 lakh in manufacturing",
            "target_beneficiaries": "Unemployed youth, traditional artisans, rural population",
            "benefits": "Margin money subsidy 15-35% of project cost, loans up to Rs 50 lakh for manufacturing",
            "application_process": "Apply through KVIC/KVIB/DIC or online portal",
            "application_link": "https://www.kviconline.gov.in/pmegp/",
            "state": "Central",
            "category": "employment"
        },
    ]
    
    # Add source URL
    for scheme in known_schemes:
        scheme["source_url"] = scheme.get("application_link", "")
    
    return known_schemes


# =============================================================================
# OUTPUT FUNCTIONS
# =============================================================================

def save_results(schemes: List[Dict], output_dir: str):
    """
    Save scraped schemes to JSON and CSV files.
    
    Args:
        schemes: List of scheme dictionaries
        output_dir: Directory to save output files
    """
    if not schemes:
        print("\n⚠ No schemes to save!")
        return
    
    print("\n" + "="*60)
    print("SAVING RESULTS")
    print("="*60)
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Save JSON
    json_path = os.path.join(output_dir, 'india_financial_schemes.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(schemes, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Saved JSON: {json_path}")
    
    # Save CSV
    csv_path = os.path.join(output_dir, 'india_financial_schemes.csv')
    df = pd.DataFrame(schemes)
    df.to_csv(csv_path, index=False, encoding='utf-8')
    print(f"✓ Saved CSV: {csv_path}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total schemes saved: {len(schemes)}")
    
    # Category breakdown
    categories = {}
    for scheme in schemes:
        cat = scheme.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nCategory breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  • {cat}: {count}")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """
    Main function to orchestrate the scraping process.
    """
    print("\n" + "="*60)
    print("INDIA GOVERNMENT FINANCIAL SCHEMES SCRAPER")
    print("="*60)
    print(f"Target: {SCHEMES_URL}")
    print(f"Output: {OUTPUT_DIR}")
    
    all_schemes = []
    
    # Step 1: Add known important schemes (guaranteed data)
    print("\n" + "-"*60)
    print("STEP 1: Loading curated schemes database...")
    print("-"*60)
    known_schemes = scrape_additional_sources()
    all_schemes.extend(known_schemes)
    print(f"✓ Loaded {len(known_schemes)} curated schemes")
    
    # Step 2: Try to scrape from india.gov.in
    print("\n" + "-"*60)
    print("STEP 2: Scraping from india.gov.in...")
    print("-"*60)
    
    try:
        scheme_links = get_scheme_links()
        
        if scheme_links:
            print(f"\nScraping {len(scheme_links)} scheme pages...")
            
            for i, url in enumerate(scheme_links, 1):
                print(f"\nScraping scheme {i}/{len(scheme_links)}: {url[:60]}...")
                
                scheme = scrape_scheme_page(url)
                
                if scheme and scheme.get('scheme_name'):
                    # Check for duplicates
                    existing_names = [s['scheme_name'].lower() for s in all_schemes]
                    if scheme['scheme_name'].lower() not in existing_names:
                        all_schemes.append(scheme)
                        print(f"  ✓ {scheme['scheme_name'][:50]}")
                    else:
                        print(f"  ○ Duplicate: {scheme['scheme_name'][:50]}")
                else:
                    print(f"  ✗ Could not extract scheme data")
                
                time.sleep(REQUEST_DELAY)  # Polite delay
        else:
            print("  No scheme links found from website scraping")
            
    except Exception as e:
        print(f"  ⚠ Web scraping encountered an error: {e}")
        print("  Continuing with curated schemes database...")
    
    # Step 3: Save results
    print("\n" + "-"*60)
    print("STEP 3: Saving results...")
    print("-"*60)
    save_results(all_schemes, OUTPUT_DIR)
    
    print("\n" + "="*60)
    print("SCRAPING COMPLETE!")
    print("="*60)
    
    return all_schemes


if __name__ == "__main__":
    schemes = main()
