import os
import json
import re
import concurrent.futures

import streamlit as st
from pypdf import PdfReader
from google import genai

st.set_page_config(page_title="Multi-Agent HR Intelligence", page_icon="🤖", layout="wide")

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

AGENTS = {
    "Technical Agent": "Evaluate technical depth directly against the Job Description's required stack.",
    "HR Agent": "Evaluate experience level, communication, collaboration and culture alignment against the Job Description.",
    "Skeptic Agent": "Cross-check resume claims against transcript evidence and Job Description expectations. Identify gaps or ambiguities.",
    "Hiring Manager Agent": "Assess overall role suitability and readiness for the specific Job Description."
}

def pdf_text(uploaded_file):
    if not uploaded_file:
        return ""
    reader = PdfReader(uploaded_file)
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if not text:
        raise ValueError(f"{uploaded_file.name} contains no readable text.")
    return text

def sanitize(text):
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
    return text[:60000]

def get_client():
    key = st.secrets.get("GEMINI_API_KEY", os.getenv("GEMINI_API_KEY"))
    if not key:
        raise RuntimeError("GEMINI_API_KEY is missing. Add it to Streamlit Secrets.")
    return genai.Client(api_key=key)

def parse_json(text):
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw": text, "score": 0, "confidence": 0,
                "verdict": "Insufficient evidence in source documents",
                "strengths": [], "concerns": [], "evidence": []}

def run_agent(item):
    name, instruction, profile = item
    prompt = f"""You are the {name}. {instruction}
You are independent: do not reference any other agent.
Use the Job Description as the primary benchmark.
Do not invent facts. For missing evidence say exactly:
"Insufficient evidence in source documents".
Return ONLY JSON with keys: agent, score, confidence, verdict, strengths, concerns, evidence.
Every substantive claim must include a short verbatim supporting quote.

RESUME:
{profile["resume"]}

TRANSCRIPT:
{profile["transcript"]}

JOB DESCRIPTION:
{profile["jd"]}"""
    client = get_client()
    response = client.models.generate_content(model=MODEL, contents=prompt)
    result = parse_json(response.text)
    result["agent"] = name
    return result

def generate_text(prompt):
    client = get_client()
    return client.models.generate_content(model=MODEL, contents=prompt).text

st.title("Multi-Agent HR Candidate Intelligence")
st.caption("Upload three PDFs → independent AI analysis → debate → final recruiter report")

with st.sidebar:
    st.header("Pipeline")
    st.write("1. Extracting Profile")
    st.write("2. Independent Agent Analysis")
    st.write("3. Multi-Agent Debate")
    st.write("4. Final Decision")

col1, col2, col3 = st.columns(3)
with col1:
    resume = st.file_uploader("Candidate Resume", type=["pdf"], key="resume")
with col2:
    transcript = st.file_uploader("Interview Transcript", type=["pdf"], key="transcript")
with col3:
    jd = st.file_uploader("Job Description (JD)", type=["pdf"], key="jd")

if st.button("Run Evaluation", type="primary", use_container_width=True):
    if not all([resume, transcript, jd]):
        st.error("Please upload Resume, Transcript, and Job Description PDFs.")
        st.stop()

    try:
        with st.status("Analyzing evidence...", expanded=True) as status:
            status.write("Step 1/4: Extracting profile")
            profile = {
                "resume": sanitize(pdf_text(resume)),
                "transcript": sanitize(pdf_text(transcript)),
                "jd": sanitize(pdf_text(jd)),
            }

            status.write("Step 2/4: Running four independent agents concurrently")
            jobs = [(name, instruction, profile) for name, instruction in AGENTS.items()]
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                results = list(executor.map(run_agent, jobs))

            status.write("Step 3/4: Generating structured debate")
            debate_prompt = """Given these independent agent outputs, create a concise JSON object with:
agreedPoints, disagreedPoints, shiftedStances, unresolvedStances.
Explicitly describe agreements or conflicts and cite agent names.
OUTPUTS:
""" + json.dumps(results)
            debate = parse_json(generate_text(debate_prompt))

            status.write("Step 4/4: Synthesizing evidence-weighted decision")
            final_prompt = """Produce a recruiter decision using evidence, not score averaging.
Weigh Skeptic concerns, confidence, Job Description fit, and cited evidence.
Return ONLY JSON with recommendation, overallMatch, confidence, strengths, concerns,
unresolvedFriction, and executiveSummary.
Every conclusion must be grounded in source evidence or explicitly state insufficient evidence.
AGENTS:
""" + json.dumps(results) + "\nDEBATE:\n" + json.dumps(debate)
            final = parse_json(generate_text(final_prompt))

            status.update(label="Evaluation complete", state="complete")

        st.success("Resume, transcript, and Job Description evaluated successfully.")

        st.header("Recruiter Dashboard")
        scores = [r.get("score", 0) or 0 for r in results]
        metrics = st.columns(4)
        for col, result in zip(metrics, results):
            col.metric(result["agent"], f'{result.get("score", 0)}%')

        st.subheader("Agent Evidence")
        for result in results:
            with st.expander(result["agent"], expanded=False):
                st.json(result)

        st.subheader("Agreement vs. Disagreement")
        st.json(debate)

        st.subheader("Final Decision")
        st.json(final)

        summary = final.get("executiveSummary", "")
        if summary:
            st.subheader("Recruiter Audio Overview")
            if st.button("Play Overview"):
                st.info("Copy this summary into a browser with speech support if your deployment blocks audio:")
                st.write(summary)

    except Exception as exc:
        st.error(f"Evaluation failed: {exc}")
        st.info("Check Streamlit Secrets for GEMINI_API_KEY and ensure PDFs contain readable text.")
