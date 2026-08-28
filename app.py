import streamlit as st
import time

# Page configuration
st.set_page_config(
    page_title="Multi-Agent System",
    page_icon="🤖",
    layout="wide"
)

# Custom title and description
st.title("🤖 Multi-Agent System Dashboard")
st.markdown("Interact with your multi-agent architecture below.")

# Sidebar for configuration and API Keys
with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.text_input("API Key", type="password", help="Enter your LLM provider API key here.")
    agent_model = st.selectbox("Select Model", ["gpt-4o", "gpt-3.5-turbo", "claude-3-5-sonnet"])
    st.divider()
    st.markdown("### Agent Settings")
    temperature = st.slider("Temperature", 0.0, 1.0, 0.7)

# Main interaction area
prompt = st.text_area("Enter your objective or query:", placeholder="e.g., Analyze market trends and write a summary report...")

if st.button("🚀 Run Multi-Agent System", type="primary"):
    if not prompt:
        st.warning("Please enter a prompt before running.")
    else:
        st.subheader("Execution Progress")
        
        # Simulated agent workflow - Replace with your actual agent calls
        with st.status("Agents working...", expanded=True) as status:
            st.write("🔍 **Planner Agent:** Breaking down the task...")
            time.sleep(1.5)
            
            st.write("🌐 **Research Agent:** Gathering information...")
            time.sleep(2)
            
            st.write("✍️ **Writer Agent:** Synthesizing final response...")
            time.sleep(1.5)
            
            status.update(label="All agents completed their tasks!", state="complete", expanded=False)

        # Output area
        st.subheader("📌 Final Result")
        st.success("Agents completed the run successfully.")
        st.markdown(f"**Objective:** {prompt}")
        st.markdown("""
        ### Agent Summary
        - **Research:** Data collected successfully.
        - **Analysis:** Key insights generated.
        - **Status:** Complete.
        """)
